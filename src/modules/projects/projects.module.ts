import { Module } from '@nestjs/common';
import { ProjectService } from './application/project.service';
import { AiuService } from './application/aiu.service';
import { ProjectsController } from './presentation/projects.controller';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectService, AiuService],
  exports: [ProjectService, AiuService],
})
export class ProjectsModule {}
