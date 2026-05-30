import { Module } from '@nestjs/common';
import { CertificateService } from './application/certificate.service';
import { CertificateController } from './presentation/certificate.controller';

@Module({
  controllers: [CertificateController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificatesModule {}
