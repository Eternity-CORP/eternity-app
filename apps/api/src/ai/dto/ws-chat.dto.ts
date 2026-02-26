import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChatMessageDto } from './chat-message.dto';

/**
 * DTO for the WebSocket AI chat event.
 * Validates message content and optional conversation history.
 */
export class WsChatDto {
  @IsString()
  @IsNotEmpty({ message: 'Message content is required' })
  @MaxLength(1000, { message: 'Message must not exceed 1000 characters' })
  content: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];
}
