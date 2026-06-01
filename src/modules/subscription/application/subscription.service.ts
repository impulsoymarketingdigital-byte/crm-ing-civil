import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

const TRIAL_DAYS = 5;

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'suspended';

export interface SubscriptionInfo {
  status:              SubscriptionStatus;
  trialDaysLeft:       number | null;
  trialEndsAt:         Date   | null;
  plan:                string | null;
  subscriptionEndDate: Date   | null;
  billingEmail:        string | null;
  isBlocked:           boolean;  // true when access should be denied
}

export const PLANS = {
  monthly:    { name: 'Plan Mensual',  priceUsd: 59,  intervalDays: 30,  description: '$59 USD / 8 usuarios / mes'  },
  annual:     { name: 'Plan Anual',    priceUsd: 590, intervalDays: 365, description: '$590 USD / 8 usuarios / año' },
  enterprise: { name: 'Enterprise',   priceUsd: 0,   intervalDays: 365, description: 'Precio personalizado'         },
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Check if tenant has access ────────────────────────────────────────

  async getStatus(tenantId: string): Promise<SubscriptionInfo> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');

    const now    = new Date();
    const status = tenant.subscriptionStatus as SubscriptionStatus;

    if (status === 'trial') {
      const endsAt = tenant.trialEndsAt;
      if (endsAt && endsAt < now) {
        // Trial expired — update DB lazily
        await this.prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'expired' } });
        return { status: 'expired', trialDaysLeft: 0, trialEndsAt: endsAt, plan: null,
                 subscriptionEndDate: null, billingEmail: tenant.billingEmail, isBlocked: true };
      }
      const msLeft   = endsAt ? endsAt.getTime() - now.getTime() : TRIAL_DAYS * 86400000;
      const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
      return { status: 'trial', trialDaysLeft: daysLeft, trialEndsAt: endsAt ?? null,
               plan: null, subscriptionEndDate: null, billingEmail: tenant.billingEmail, isBlocked: false };
    }

    if (status === 'active') {
      const endDate = tenant.subscriptionEndDate;
      if (endDate && endDate < now) {
        await this.prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'expired' } });
        return { status: 'expired', trialDaysLeft: null, trialEndsAt: null,
                 plan: tenant.subscriptionPlan, subscriptionEndDate: endDate, billingEmail: tenant.billingEmail, isBlocked: true };
      }
      return { status: 'active', trialDaysLeft: null, trialEndsAt: null,
               plan: tenant.subscriptionPlan, subscriptionEndDate: endDate ?? null,
               billingEmail: tenant.billingEmail, isBlocked: false };
    }

    // expired | cancelled | suspended → blocked
    return { status, trialDaysLeft: null, trialEndsAt: null,
             plan: tenant.subscriptionPlan, subscriptionEndDate: null,
             billingEmail: tenant.billingEmail, isBlocked: true };
  }

  /** Returns true if the tenant should be allowed through */
  async isAccessAllowed(tenantId: string): Promise<boolean> {
    try {
      const info = await this.getStatus(tenantId);
      return !info.isBlocked;
    } catch {
      return false;
    }
  }

  // ── Activate a paid plan (admin action, or webhook confirmation) ───────

  async activatePlan(tenantId: string, plan: 'monthly' | 'annual' | 'enterprise',
                     billingEmail?: string) {
    const planDef = PLANS[plan];
    const now     = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + planDef.intervalDays);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus:    'active',
        subscriptionPlan:      plan,
        subscriptionStartDate: now,
        subscriptionEndDate:   endDate,
        nextBillingDate:       endDate,
        ...(billingEmail ? { billingEmail } : {}),
      },
      select: { id: true, name: true, slug: true, subscriptionStatus: true,
                subscriptionPlan: true, subscriptionEndDate: true },
    });
  }

  // ── User requests a plan (sends email / flags for admin review) ────────

  async requestPlan(tenantId: string, plan: string, billingEmail: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');

    // Update billing email and mark plan requested
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data:  { billingEmail },
    });

    // In production: send email to sales team, trigger Stripe checkout, etc.
    this.logger.log(
      `Plan request: tenant=${tenant.slug} plan=${plan} email=${billingEmail}`,
    );

    return {
      message: 'Solicitud recibida. Nuestro equipo te contactará en menos de 24 horas para confirmar el pago y activar tu cuenta.',
      plan,
      billingEmail,
      tenant: { name: tenant.name, slug: tenant.slug },
    };
  }

  // ── Set trial on new tenant registration ─────────────────────────────

  async initTrial(tenantId: string) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data:  { subscriptionStatus: 'trial', trialEndsAt },
    });
  }

  // ── Cron: mark expired trials / subscriptions ────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async markExpired() {
    const now = new Date();

    const [expiredTrials, expiredSubs] = await Promise.all([
      this.prisma.tenant.updateMany({
        where: { subscriptionStatus: 'trial', trialEndsAt: { lt: now } },
        data:  { subscriptionStatus: 'expired' },
      }),
      this.prisma.tenant.updateMany({
        where: { subscriptionStatus: 'active', subscriptionEndDate: { lt: now } },
        data:  { subscriptionStatus: 'expired' },
      }),
    ]);

    const total = expiredTrials.count + expiredSubs.count;
    if (total > 0) {
      this.logger.warn(`Marked ${expiredTrials.count} trial(s) and ${expiredSubs.count} subscription(s) as expired`);
    }
  }

  // ── Available plans (for frontend) ──────────────────────────────────

  getAvailablePlans() {
    return Object.entries(PLANS).map(([key, val]) => ({ key, ...val }));
  }
}
