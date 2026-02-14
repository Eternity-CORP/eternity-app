import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  Business,
  BusinessMemberEntity,
  BusinessProposalEntity,
  BusinessActivityEntity,
} from './entities';
import { CreateBusinessDto, CreateProposalDto } from './dto';
import { BusinessGateway } from './business.gateway';

/**
 * Database row types (snake_case)
 */
interface BusinessRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  token_symbol: string;
  token_supply: number;
  contract_address: string;
  treasury_address: string;
  factory_tx_hash: string;
  network: string;
  transfer_policy: string;
  quorum_threshold: number;
  voting_period: number;
  vesting_enabled: boolean;
  vesting_config: Record<string, unknown> | null;
  dividends_enabled: boolean;
  dividends_config: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
}

interface BusinessMemberRow {
  id: string;
  business_id: string;
  address: string;
  username: string | null;
  initial_shares: number;
  role: string;
  joined_at: string;
}

interface BusinessProposalRow {
  id: string;
  business_id: string;
  on_chain_id: number;
  type: string;
  title: string;
  description: string | null;
  data_json: Record<string, unknown> | null;
  deadline: string;
  status: string;
  created_by: string;
  created_at: string;
}

interface BusinessActivityRow {
  id: string;
  business_id: string;
  type: string;
  description: string;
  actor_address: string | null;
  tx_hash: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @Inject(forwardRef(() => BusinessGateway))
    private readonly businessGateway: BusinessGateway,
  ) {}

  async create(dto: CreateBusinessDto): Promise<Business> {
    this.logger.log(`Creating business "${dto.name}" by ${dto.createdBy}`);

    const { data: businessData, error: businessError } = await this.supabase
      .from('businesses')
      .insert({
        name: dto.name,
        description: dto.description || null,
        icon: dto.icon || null,
        token_symbol: dto.tokenSymbol,
        token_supply: dto.tokenSupply,
        contract_address: dto.contractAddress.toLowerCase(),
        treasury_address: dto.treasuryAddress.toLowerCase(),
        factory_tx_hash: dto.factoryTxHash,
        network: dto.network || 'sepolia',
        transfer_policy: dto.transferPolicy,
        quorum_threshold: dto.quorumThreshold,
        voting_period: dto.votingPeriod,
        vesting_enabled: dto.vestingEnabled,
        vesting_config: dto.vestingConfig || null,
        dividends_enabled: dto.dividendsEnabled,
        dividends_config: dto.dividendsConfig || null,
        created_by: dto.createdBy.toLowerCase(),
      })
      .select()
      .single();

    if (businessError || !businessData) {
      this.logger.error('Failed to create business', businessError);
      throw new BadRequestException('Failed to create business');
    }

    // Insert members
    const membersToInsert = dto.members.map((m) => ({
      business_id: businessData.id,
      address: m.address.toLowerCase(),
      username: m.username || null,
      initial_shares: m.shares,
      role: m.role,
    }));

    const { data: membersData, error: membersError } = await this.supabase
      .from('business_members')
      .insert(membersToInsert)
      .select();

    if (membersError || !membersData) {
      this.logger.error('Failed to create business members', membersError);
      await this.supabase.from('businesses').delete().eq('id', businessData.id);
      throw new BadRequestException('Failed to create business members');
    }

    // Insert activity log entry
    await this.supabase.from('business_activity').insert({
      business_id: businessData.id,
      type: 'created',
      description: `Business "${dto.name}" created with ${dto.tokenSupply} ${dto.tokenSymbol} tokens`,
      actor_address: dto.createdBy.toLowerCase(),
      tx_hash: dto.factoryTxHash,
    });

    const business = this.mapToBusiness(businessData, membersData);
    this.logger.log(`Business created: ${business.id}`);

    return business;
  }

  async findByContractAddress(contractAddress: string): Promise<Business> {
    const normalizedAddress = contractAddress.toLowerCase();

    const { data: businessData, error: businessError } = await this.supabase
      .from('businesses')
      .select('*')
      .eq('contract_address', normalizedAddress)
      .single();

    if (businessError || !businessData) {
      throw new NotFoundException(`Business with contract ${contractAddress} not found`);
    }

    const { data: membersData } = await this.supabase
      .from('business_members')
      .select('*')
      .eq('business_id', businessData.id);

    return this.mapToBusiness(businessData, membersData || []);
  }

  async findByUserAddress(address: string): Promise<Business[]> {
    const normalizedAddress = address.toLowerCase();

    // Find businesses where user is a member
    const { data: memberRows, error: memberError } = await this.supabase
      .from('business_members')
      .select('business_id')
      .eq('address', normalizedAddress);

    if (memberError) {
      this.logger.error('Failed to fetch user memberships', memberError);
      throw new BadRequestException('Failed to fetch user businesses');
    }

    if (!memberRows || memberRows.length === 0) {
      return [];
    }

    const businessIds = memberRows.map((m) => m.business_id);

    const { data: businessesData, error: businessesError } = await this.supabase
      .from('businesses')
      .select('*')
      .in('id', businessIds)
      .order('created_at', { ascending: false });

    if (businessesError || !businessesData) {
      throw new BadRequestException('Failed to fetch businesses');
    }

    // Get all members for these businesses
    const { data: allMembersData } = await this.supabase
      .from('business_members')
      .select('*')
      .in('business_id', businessIds);

    const membersByBusinessId = new Map<string, BusinessMemberRow[]>();
    (allMembersData || []).forEach((m: BusinessMemberRow) => {
      if (!membersByBusinessId.has(m.business_id)) {
        membersByBusinessId.set(m.business_id, []);
      }
      membersByBusinessId.get(m.business_id)!.push(m);
    });

    return businessesData.map((b: BusinessRow) =>
      this.mapToBusiness(b, membersByBusinessId.get(b.id) || []),
    );
  }

  async createProposal(businessId: string, dto: CreateProposalDto): Promise<BusinessProposalEntity> {
    this.logger.log(`Creating proposal for business ${businessId}`);

    // Verify business exists
    const { data: businessData, error: businessError } = await this.supabase
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single();

    if (businessError || !businessData) {
      throw new NotFoundException(`Business ${businessId} not found`);
    }

    const { data: proposalData, error: proposalError } = await this.supabase
      .from('business_proposals')
      .insert({
        business_id: businessId,
        on_chain_id: dto.onChainId,
        type: dto.type,
        title: dto.title,
        description: dto.description || null,
        data_json: dto.data || null,
        deadline: dto.deadline,
        status: 'active',
        created_by: dto.createdBy.toLowerCase(),
      })
      .select()
      .single();

    if (proposalError || !proposalData) {
      this.logger.error('Failed to create proposal', proposalError);
      throw new BadRequestException('Failed to create proposal');
    }

    // Insert activity log
    await this.supabase.from('business_activity').insert({
      business_id: businessId,
      type: 'proposal',
      description: `Proposal "${dto.title}" created`,
      actor_address: dto.createdBy.toLowerCase(),
    });

    const proposal = this.mapToProposal(proposalData);

    // Notify via WebSocket
    this.businessGateway.notifyProposalCreated(businessId, proposal);

    return proposal;
  }

  async getActivity(businessId: string): Promise<BusinessActivityEntity[]> {
    const { data, error } = await this.supabase
      .from('business_activity')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      this.logger.error('Failed to fetch activity', error);
      throw new BadRequestException('Failed to fetch activity');
    }

    return (data || []).map((row: BusinessActivityRow) => this.mapToActivity(row));
  }

  async update(id: string, data: Partial<CreateBusinessDto>): Promise<Business> {
    const updatePayload: Record<string, unknown> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.icon !== undefined) updatePayload.icon = data.icon;
    if (data.transferPolicy !== undefined) updatePayload.transfer_policy = data.transferPolicy;
    if (data.quorumThreshold !== undefined) updatePayload.quorum_threshold = data.quorumThreshold;
    if (data.votingPeriod !== undefined) updatePayload.voting_period = data.votingPeriod;
    if (data.vestingEnabled !== undefined) updatePayload.vesting_enabled = data.vestingEnabled;
    if (data.vestingConfig !== undefined) updatePayload.vesting_config = data.vestingConfig;
    if (data.dividendsEnabled !== undefined) updatePayload.dividends_enabled = data.dividendsEnabled;
    if (data.dividendsConfig !== undefined) updatePayload.dividends_config = data.dividendsConfig;

    const { data: updatedData, error } = await this.supabase
      .from('businesses')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedData) {
      this.logger.error('Failed to update business', error);
      throw new BadRequestException('Failed to update business');
    }

    const { data: membersData } = await this.supabase
      .from('business_members')
      .select('*')
      .eq('business_id', id);

    return this.mapToBusiness(updatedData, membersData || []);
  }

  private mapToBusiness(row: BusinessRow, members: BusinessMemberRow[]): Business {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      tokenSymbol: row.token_symbol,
      tokenSupply: row.token_supply,
      contractAddress: row.contract_address,
      treasuryAddress: row.treasury_address,
      factoryTxHash: row.factory_tx_hash,
      network: row.network,
      transferPolicy: row.transfer_policy,
      quorumThreshold: row.quorum_threshold,
      votingPeriod: row.voting_period,
      vestingEnabled: row.vesting_enabled,
      vestingConfig: row.vesting_config,
      dividendsEnabled: row.dividends_enabled,
      dividendsConfig: row.dividends_config,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      members: members.map((m): BusinessMemberEntity => ({
        id: m.id,
        businessId: m.business_id,
        address: m.address,
        username: m.username,
        initialShares: m.initial_shares,
        role: m.role,
        joinedAt: new Date(m.joined_at),
      })),
    };
  }

  private mapToProposal(row: BusinessProposalRow): BusinessProposalEntity {
    return {
      id: row.id,
      businessId: row.business_id,
      onChainId: row.on_chain_id,
      type: row.type,
      title: row.title,
      description: row.description,
      dataJson: row.data_json,
      deadline: new Date(row.deadline),
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
    };
  }

  private mapToActivity(row: BusinessActivityRow): BusinessActivityEntity {
    return {
      id: row.id,
      businessId: row.business_id,
      type: row.type,
      description: row.description,
      actorAddress: row.actor_address,
      txHash: row.tx_hash,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
    };
  }
}
