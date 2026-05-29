import { Module } from '@nestjs/common';
import { JournalEntriesService } from './application/journal-entries.service';
import { JournalEntriesController } from './presentation/journal-entries.controller';
import { JournalEntriesRepository } from './infrastructure/journal-entries.repository';

@Module({
  controllers: [JournalEntriesController],
  providers: [JournalEntriesService, JournalEntriesRepository],
  exports: [JournalEntriesService],
})
export class JournalEntriesModule {}
