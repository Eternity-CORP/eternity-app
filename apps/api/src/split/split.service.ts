import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SplitBill, SplitParticipant, SplitBillStatus, ParticipantStatus } from './entities';
import { CreateSplitDto, MarkPaidDto } from './dto';
import { SplitGateway } from './split.gateway';

// Spam protection constants
const MAX_ACTIVE_SPLITS_PER_ADDRESS = 10;
const MAX_PARTICIPANTS_PER_SPLIT = 20;

/**
 * Database row types (snake_case)
 */
interface SplitBillRow {
  id: string;
  creator_address: string;
  creator_username: string | null;
  recipient_address: string | null;
  total_amount: string;
  token_symbol: string;
  chain_id: number | null;
  description: string | null;
  status: SplitBillStatus;
  created_at: string;
  updated_at: string;
}

interface SplitParticipantRow {
  id: string;
  split_id: string;
  address: string;
  username: string | null;
  name: string | null;
  amount: string;
  status: ParticipantStatus;
  paid_tx_hash: string | null;
  paid_at: string | null;
}

@Injectable()
export class SplitService {
  private readonly logger = new Logger(SplitService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @Inject(forwardRef(() => SplitGateway))
    private readonly splitGateway: SplitGateway,
  ) {}

  /**
   * Count active splits for a given creator address
   */
  private async countActiveSplitsForAddress(address: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('split_bills')
      .select('*', { count: 'exact', head: true })
      .eq('creator_address', address.toLowerCase())
      .eq('status', 'active');

    if (error) {
      this.logger.error('Failed to count active splits', error);
      return 0;
    }

    return count || 0;
  }

  async create(dto: CreateSplitDto): Promise<SplitBill> {
    this.logger.log(`Creating split bill for ${dto.creatorAddress}`);

    // --- Spam protection ---

    // 1. Check participant count limit
    if (dto.participants.length > MAX_PARTICIPANTS_PER_SPLIT) {
      throw new BadRequestException(
        `Too many participants: maximum ${MAX_PARTICIPANTS_PER_SPLIT} allowed, got ${dto.participants.length}`,
      );
    }

    // 2. Check active splits rate limit per creator address
    const activeSplits = await this.countActiveSplitsForAddress(dto.creatorAddress);
    if (activeSplits >= MAX_ACTIVE_SPLITS_PER_ADDRESS) {
      throw new BadRequestException(
        `Rate limit: maximum ${MAX_ACTIVE_SPLITS_PER_ADDRESS} active splits per address`,
      );
    }

    // 3. Server-side validation: participant amounts must not exceed totalAmount
    const totalAmount = parseFloat(dto.totalAmount);
    if (!isNaN(totalAmount) && totalAmount > 0) {
      const participantSum = dto.participants.reduce(
        (sum, p) => sum + parseFloat(p.amount || '0'),
        0,
      );
      if (participantSum > totalAmount + 0.01) {
        throw new BadRequestException(
          `Participant amounts sum (${participantSum.toFixed(6)}) exceeds total amount (${dto.totalAmount})`,
        );
      }
    }

    // 4. Validate all participant amounts are positive
    for (const p of dto.participants) {
      const amt = parseFloat(p.amount);
      if (isNaN(amt) || amt <= 0) {
        throw new BadRequestException(
          `Invalid participant amount: "${p.amount}" for address ${p.address}`,
        );
      }
    }

    // Insert split bill first
    const { data: splitBillData, error: splitError } = await this.supabase
      .from('split_bills')
      .insert({
        creator_address: dto.creatorAddress.toLowerCase(),
        creator_username: dto.creatorUsername,
        recipient_address: dto.recipientAddress?.toLowerCase() || null,
        total_amount: dto.totalAmount,
        token_symbol: dto.tokenSymbol,
        chain_id: dto.chainId ?? null,
        description: dto.description,
        status: 'active',
      })
      .select()
      .single();

    if (splitError || !splitBillData) {
      this.logger.error('Failed to create split bill', splitError);
      throw new BadRequestException('Failed to create split bill');
    }

    // Insert participants with the split_id
    const participantsToInsert = dto.participants.map((p) => ({
      split_id: splitBillData.id,
      address: p.address.toLowerCase(),
      username: p.username,
      name: p.name,
      amount: p.amount,
      status: 'pending',
    }));

    const { data: participantsData, error: participantsError } =
      await this.supabase
        .from('split_participants')
        .insert(participantsToInsert)
        .select();

    if (participantsError || !participantsData) {
      this.logger.error('Failed to create participants', participantsError);
      // Clean up split bill if participants fail
      await this.supabase.from('split_bills').delete().eq('id', splitBillData.id);
      throw new BadRequestException('Failed to create participants');
    }

    // Construct the full split bill with participants
    const splitBill = this.mapToSplitBill(splitBillData, participantsData);
    this.logger.log(`Split bill created: ${splitBill.id}`);

    // Notify participants via WebSocket
    this.splitGateway.notifySplitCreated(splitBill);

    return splitBill;
  }

  async findById(id: string): Promise<SplitBill> {
    // Get split bill
    const { data: splitBillData, error: splitError } = await this.supabase
      .from('split_bills')
      .select('*')
      .eq('id', id)
      .single();

    if (splitError || !splitBillData) {
      throw new NotFoundException(`Split bill ${id} not found`);
    }

    // Get participants
    const { data: participantsData, error: participantsError } =
      await this.supabase
        .from('split_participants')
        .select('*')
        .eq('split_id', id);

    if (participantsError) {
      this.logger.error('Failed to fetch participants', participantsError);
      throw new BadRequestException('Failed to fetch participants');
    }

    return this.mapToSplitBill(splitBillData, participantsData || []);
  }

  async findByCreator(creatorAddress: string): Promise<SplitBill[]> {
    const normalizedAddress = creatorAddress.toLowerCase();
    this.logger.debug(`findByCreator: querying for creator_address=${normalizedAddress}`);

    // Get split bills for creator
    const { data: splitBillsData, error: splitError } = await this.supabase
      .from('split_bills')
      .select('*')
      .eq('creator_address', normalizedAddress)
      .order('created_at', { ascending: false });

    if (splitError) {
      this.logger.error(`findByCreator failed: ${splitError.message} (code: ${splitError.code})`);
      throw new BadRequestException(`Failed to fetch split bills: ${splitError.message}`);
    }

    if (!splitBillsData || splitBillsData.length === 0) {
      this.logger.debug(`findByCreator: found 0 split bills for ${normalizedAddress}`);
      return [];
    }

    this.logger.debug(`findByCreator: found ${splitBillsData.length} split bills for ${normalizedAddress}`);

    // Get all participants for these splits
    const splitIds = splitBillsData.map((bill) => bill.id);
    const { data: participantsData, error: participantsError } =
      await this.supabase
        .from('split_participants')
        .select('*')
        .in('split_id', splitIds);

    if (participantsError) {
      this.logger.error(`Failed to fetch participants: ${participantsError.message}`);
      throw new BadRequestException(`Failed to fetch split participants: ${participantsError.message}`);
    }

    // Group participants by split_id
    const participantsBySplitId = new Map<string, SplitParticipantRow[]>();
    (participantsData || []).forEach((p: SplitParticipantRow) => {
      if (!participantsBySplitId.has(p.split_id)) {
        participantsBySplitId.set(p.split_id, []);
      }
      participantsBySplitId.get(p.split_id)!.push(p);
    });

    // Map to SplitBill objects
    return splitBillsData.map((bill: SplitBillRow) =>
      this.mapToSplitBill(bill, participantsBySplitId.get(bill.id) || []),
    );
  }

  async findPendingForAddress(address: string): Promise<SplitBill[]> {
    const normalizedAddress = address.toLowerCase();
    this.logger.debug(`findPendingForAddress: querying for address=${normalizedAddress}`);

    // Find all pending participants for this address
    const { data: participantsData, error: participantsError } =
      await this.supabase
        .from('split_participants')
        .select('*')
        .eq('address', normalizedAddress)
        .eq('status', 'pending');

    if (participantsError) {
      this.logger.error(`Failed to fetch pending participants: ${participantsError.message}`);
      throw new BadRequestException(`Failed to fetch pending participants: ${participantsError.message}`);
    }

    if (!participantsData || participantsData.length === 0) {
      this.logger.debug(`findPendingForAddress: no pending splits for ${normalizedAddress}`);
      return [];
    }

    // Get the split bills for these participants
    const splitIds = participantsData.map((p) => p.split_id);
    const { data: splitBillsData, error: splitError } = await this.supabase
      .from('split_bills')
      .select('*')
      .in('id', splitIds)
      .eq('status', 'active');

    if (splitError) {
      this.logger.error(`Failed to fetch split bills: ${splitError.message}`);
      throw new BadRequestException(`Failed to fetch split bills: ${splitError.message}`);
    }

    if (!splitBillsData || splitBillsData.length === 0) {
      return [];
    }

    // Get all participants for these splits
    const { data: allParticipantsData, error: allParticipantsError } =
      await this.supabase
        .from('split_participants')
        .select('*')
        .in('split_id', splitIds);

    if (allParticipantsError) {
      this.logger.error(`Failed to fetch all participants: ${allParticipantsError.message}`);
      throw new BadRequestException(`Failed to fetch all participants: ${allParticipantsError.message}`);
    }

    // Group participants by split_id
    const participantsBySplitId = new Map<string, SplitParticipantRow[]>();
    (allParticipantsData || []).forEach((p: SplitParticipantRow) => {
      if (!participantsBySplitId.has(p.split_id)) {
        participantsBySplitId.set(p.split_id, []);
      }
      participantsBySplitId.get(p.split_id)!.push(p);
    });

    // Map to SplitBill objects
    return splitBillsData.map((bill: SplitBillRow) =>
      this.mapToSplitBill(bill, participantsBySplitId.get(bill.id) || []),
    );
  }

  async markParticipantPaid(
    splitId: string,
    dto: MarkPaidDto,
  ): Promise<SplitBill> {
    const splitBill = await this.findById(splitId);

    if (splitBill.status !== 'active') {
      throw new BadRequestException('Split bill is not active');
    }

    const participant = splitBill.participants.find(
      (p) => p.address.toLowerCase() === dto.participantAddress.toLowerCase(),
    );

    if (!participant) {
      throw new NotFoundException('Participant not found in this split');
    }

    if (participant.status === 'paid') {
      throw new BadRequestException('Participant already paid');
    }

    // Update participant
    const { error: updateError } = await this.supabase
      .from('split_participants')
      .update({
        status: 'paid',
        paid_tx_hash: dto.txHash,
        paid_at: new Date().toISOString(),
      })
      .eq('id', participant.id);

    if (updateError) {
      this.logger.error('Failed to update participant', updateError);
      throw new BadRequestException('Failed to mark participant as paid');
    }

    // Check if all participants have paid
    const updatedBill = await this.findById(splitId);
    const allPaid = updatedBill.participants.every((p) => p.status === 'paid');

    // Notify about payment
    this.splitGateway.notifyParticipantPaid(updatedBill, dto.participantAddress);

    if (allPaid) {
      const { error: billUpdateError } = await this.supabase
        .from('split_bills')
        .update({ status: 'completed' })
        .eq('id', splitId);

      if (billUpdateError) {
        this.logger.error('Failed to update split bill status', billUpdateError);
      } else {
        this.logger.log(`Split bill ${splitId} completed - all participants paid`);
        updatedBill.status = 'completed';
        // Notify completion
        this.splitGateway.notifySplitCompleted(updatedBill);
      }
    }

    return this.findById(splitId);
  }

  async cancel(id: string, requesterAddress: string): Promise<SplitBill> {
    const splitBill = await this.findById(id);

    if (splitBill.creatorAddress.toLowerCase() !== requesterAddress.toLowerCase()) {
      throw new BadRequestException('Only creator can cancel split bill');
    }

    if (splitBill.status !== 'active') {
      throw new BadRequestException('Split bill is not active');
    }

    // Check if any participant has already paid
    const hasPaid = splitBill.participants.some((p) => p.status === 'paid');
    if (hasPaid) {
      throw new BadRequestException('Cannot cancel - some participants have already paid');
    }

    const { error: updateError } = await this.supabase
      .from('split_bills')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (updateError) {
      this.logger.error('Failed to cancel split bill', updateError);
      throw new BadRequestException('Failed to cancel split bill');
    }

    splitBill.status = 'cancelled';
    this.logger.log(`Split bill ${id} cancelled by ${requesterAddress}`);

    // Notify participants
    this.splitGateway.notifySplitCancelled(splitBill);

    return splitBill;
  }

  /**
   * Helper method to map Supabase data to SplitBill entity
   */
  private mapToSplitBill(billData: SplitBillRow, participantsData: SplitParticipantRow[]): SplitBill {
    return {
      id: billData.id,
      creatorAddress: billData.creator_address,
      creatorUsername: billData.creator_username,
      recipientAddress: billData.recipient_address,
      totalAmount: billData.total_amount,
      tokenSymbol: billData.token_symbol,
      chainId: billData.chain_id,
      description: billData.description,
      status: billData.status,
      createdAt: new Date(billData.created_at),
      updatedAt: new Date(billData.updated_at),
      participants: participantsData.map((p): SplitParticipant => ({
        id: p.id,
        splitId: p.split_id,
        address: p.address,
        username: p.username,
        name: p.name,
        amount: p.amount,
        status: p.status,
        paidTxHash: p.paid_tx_hash,
        paidAt: p.paid_at ? new Date(p.paid_at) : null,
      })),
    };
  }
}
