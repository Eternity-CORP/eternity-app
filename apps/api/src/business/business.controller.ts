import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto, CreateProposalDto } from './dto';
import { Business, BusinessProposalEntity, BusinessActivityEntity } from './entities';

@Controller('api/business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBusinessDto): Promise<Business> {
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
  ): Promise<BusinessProposalEntity> {
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
  ): Promise<Business> {
    return this.businessService.update(id, dto);
  }
}
