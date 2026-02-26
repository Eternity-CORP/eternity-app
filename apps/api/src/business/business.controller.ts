import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto, CreateProposalDto } from './dto';
import { Business, BusinessProposalEntity, BusinessActivityEntity } from './entities';

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

@Controller('api/business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateBusinessDto,
    @Headers('x-wallet-address') walletAddress: string,
  ): Promise<Business> {
    if (!walletAddress || !ETH_ADDRESS_RE.test(walletAddress)) {
      throw new BadRequestException('Valid wallet address header required');
    }

    if (dto.createdBy.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new ForbiddenException('Creator address must match wallet address');
    }

    return this.businessService.create(dto);
  }

  @Get(':contractAddress')
  async findByContractAddress(
    @Param('contractAddress') contractAddress: string,
  ): Promise<Business> {
    return this.businessService.findByContractAddress(contractAddress);
  }

  @Get('user/:address')
  async findByUserAddress(
    @Param('address') address: string,
  ): Promise<Business[]> {
    return this.businessService.findByUserAddress(address);
  }

  @Post(':id/proposal')
  @HttpCode(HttpStatus.CREATED)
  async createProposal(
    @Param('id') id: string,
    @Body() dto: CreateProposalDto,
    @Headers('x-wallet-address') walletAddress: string,
  ): Promise<BusinessProposalEntity> {
    if (!walletAddress || !ETH_ADDRESS_RE.test(walletAddress)) {
      throw new BadRequestException('Valid wallet address header required');
    }

    // Verify the requester is a member of this business
    const business = await this.businessService.findByContractAddress(id);
    const isMember = business.members.some(
      (m) => m.address.toLowerCase() === walletAddress.toLowerCase(),
    );

    if (!isMember) {
      throw new ForbiddenException(
        'Only business members can create proposals',
      );
    }

    // Also verify the dto.createdBy matches the wallet address
    if (dto.createdBy.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new ForbiddenException('Proposal creator must match wallet address');
    }

    return this.businessService.createProposal(id, dto);
  }

  @Get(':id/activity')
  async getActivity(
    @Param('id') id: string,
  ): Promise<BusinessActivityEntity[]> {
    return this.businessService.getActivity(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateBusinessDto>,
    @Headers('x-wallet-address') walletAddress: string,
  ): Promise<Business> {
    if (!walletAddress || !ETH_ADDRESS_RE.test(walletAddress)) {
      throw new BadRequestException('Valid wallet address header required');
    }

    // Verify the requester is the creator of the business
    const business = await this.businessService.findByContractAddress(id);
    if (business.createdBy.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new ForbiddenException('Only the business creator can update it');
    }

    return this.businessService.update(id, dto);
  }
}
