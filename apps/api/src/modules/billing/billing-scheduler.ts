import cron from 'node-cron';
import { prisma } from '../../core/database';
import { BillingAutomationService } from './billing-automation.service';

const billingAutomationService = new BillingAutomationService();

const DEFAULT_TZ = 'America/Sao_Paulo';
const HOURLY_CRON = '0 * * * *';

interface BillingSchedulerConfig {
  timezone: string;
  cronExpression: string;
  matchByHour: boolean;
  intervalMinutes?: number;
}

/**
 * Starts the in-process billing automation scheduler (node-cron).
 *
 * @author João Paulo da Silva
 * @since 4.9.0
 * @creationDate 10/06/2026
 * Copyright (c) 2026 NTT DATA Brasil Consultologia de Negócio e Tecnologia da Informação Ltda.
 * Todos os direitos reservados.
 */
export function startBillingScheduler(): void {
  if (process.env.BILLING_SCHEDULER_ENABLED === 'false') {
    console.info('[billing-scheduler] disabled via BILLING_SCHEDULER_ENABLED=false');
    return;
  }

  const config = resolveSchedulerConfig();

  cron.schedule(
    config.cronExpression,
    () => {
      void runScheduledTick(config);
    },
    { timezone: config.timezone },
  );

  const intervalLabel =
    config.intervalMinutes !== undefined
      ? `${config.intervalMinutes}min`
      : `cron=${config.cronExpression}`;
  const matchLabel = config.matchByHour ? 'hour-match' : 'all-active-tenants';

  console.info(
    `[billing-scheduler] started (timezone=${config.timezone}, ${intervalLabel}, ${matchLabel})`,
  );
}

async function runScheduledTick(config: BillingSchedulerConfig): Promise<void> {
  const filterByHour = config.matchByHour
    ? getZonedHour(new Date(), config.timezone)
    : undefined;

  const run = await prisma.billingJobRun.create({
    data: { status: 'running' },
  });

  try {
    const summary = await billingAutomationService.runForSchedule(filterByHour);
    await prisma.billingJobRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        summary: summary as object,
      },
    });

    if (
      summary.tenantsProcessed > 0 ||
      summary.invoicesCreated > 0 ||
      summary.chargesSent > 0 ||
      summary.tenantReportsSent > 0 ||
      summary.invoicesAutoClosed > 0 ||
      summary.overdueRemindersSent > 0 ||
      summary.errors.length > 0
    ) {
      console.info('[billing-scheduler] run summary', summary);
    }
  } catch (error) {
    await prisma.billingJobRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        summary: {
          error: error instanceof Error ? error.message : String(error),
        },
      },
    });
    console.error('[billing-scheduler] run failed', error);
  }
}

function resolveSchedulerConfig(): BillingSchedulerConfig {
  const timezone = process.env.BILLING_SCHEDULER_TZ ?? DEFAULT_TZ;
  const customCron = process.env.BILLING_SCHEDULER_CRON?.trim();

  if (customCron) {
    const matchByHour = resolveMatchByHour(customCron, undefined);
    return { timezone, cronExpression: customCron, matchByHour };
  }

  const intervalMinutes = resolveIntervalMinutes();
  const matchByHour = intervalMinutes >= 60;
  const cronExpression = matchByHour ? HOURLY_CRON : `*/${intervalMinutes} * * * *`;

  if (!matchByHour && 60 % intervalMinutes !== 0) {
    console.warn(
      `[billing-scheduler] BILLING_SCHEDULER_INTERVAL_MINUTES=${intervalMinutes} does not divide 60 evenly`,
    );
  }

  return { timezone, cronExpression, matchByHour, intervalMinutes };
}

function resolveIntervalMinutes(): number {
  const raw = process.env.BILLING_SCHEDULER_INTERVAL_MINUTES?.trim();
  if (raw) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error(
        `Invalid BILLING_SCHEDULER_INTERVAL_MINUTES="${raw}" (expected integer >= 1)`,
      );
    }
    return Math.floor(parsed);
  }

  return process.env.NODE_ENV === 'development' ? 10 : 60;
}

function resolveMatchByHour(cronExpression: string, intervalMinutes: number | undefined): boolean {
  const explicit = process.env.BILLING_SCHEDULER_MATCH_HOUR?.trim().toLowerCase();
  if (explicit === 'true') {
    return true;
  }
  if (explicit === 'false') {
    return false;
  }

  if (intervalMinutes !== undefined) {
    return intervalMinutes >= 60;
  }

  return cronExpression === HOURLY_CRON;
}

function getZonedHour(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);

  return Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
}
