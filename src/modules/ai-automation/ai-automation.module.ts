import { Module } from '@nestjs/common';
import { AiAutomationService } from './application/ai-automation.service';
import { AiAutomationController } from './presentation/ai-automation.controller';

@Module({
  controllers: [AiAutomationController],
  providers: [AiAutomationService],
  exports: [AiAutomationService],
})
export class AiAutomationModule {}
