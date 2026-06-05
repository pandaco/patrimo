import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionDto } from 'contracts';
import { SessionGuard } from '../auth/session.guard';
import { SessionUser } from '../auth/session-user.decorator';
import { AuthUser } from '../auth/types';
import { CreateTransactionDtoBody } from './dto/create-transaction.dto';
import { UpdateTransactionDtoBody } from './dto/update-transaction.dto';
import { TransactionService } from './transaction.service';

@Controller('transactions')
@UseGuards(SessionGuard)
export class TransactionController {
  constructor(private readonly transactions: TransactionService) {}

  @Get()
  list(@SessionUser() user: AuthUser): Promise<TransactionDto[]> {
    return this.transactions.listForUser(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @SessionUser() user: AuthUser,
    @Body() body: CreateTransactionDtoBody,
  ): Promise<TransactionDto> {
    return this.transactions.create(user.id, body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @SessionUser() user: AuthUser,
    @Body() body: UpdateTransactionDtoBody,
  ): Promise<TransactionDto> {
    const updated = await this.transactions.update(id, user.id, body);
    if (!updated) throw new NotFoundException('Transaction not found');
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @SessionUser() user: AuthUser,
  ): Promise<void> {
    const removed = await this.transactions.delete(id, user.id);
    if (!removed) throw new NotFoundException('Transaction not found');
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  import(
    @SessionUser() user: AuthUser,
    @UploadedFile() file: any,
  ): Promise<{ count: number }> {
    return this.transactions.importCsv(user.id, file.buffer.toString());
  }
}
