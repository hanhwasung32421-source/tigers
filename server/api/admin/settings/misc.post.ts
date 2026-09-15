import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { updateSystemSettingsExtra } from '../../../utils/system-settings'

const CssColorSchema = z
  .string()
  .trim()
  .max(40)
  .regex(/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^rgba?\([\d\s.,%]+\)$/)

const ProfitCardStyleSchema = z
  .object({
    bgColor: CssColorSchema,
    gridColor: CssColorSchema,
    borderColor: CssColorSchema,
    positiveColor: CssColorSchema,
    negativeColor: CssColorSchema,
    wonTextColor: CssColorSchema,
    statBoxBg: CssColorSchema,
    statLabelColor: CssColorSchema,
    statValueColor: CssColorSchema,
    symbolTextColor: CssColorSchema,
    longBadgeBg: CssColorSchema,
    longBadgeText: CssColorSchema,
    shortBadgeBg: CssColorSchema,
    shortBadgeText: CssColorSchema
  })
  .partial()

const BodySchema = z.object({
  telegramUrl: z.string().trim().max(300).optional(),
  krwPerUsdt: z.number().nonnegative().optional(),
  lossSettlementPercent: z.number().min(0).max(100).optional(),
  referralSettlementPercent: z.number().min(0).max(100).optional(),
  menuOrder: z.array(z.string()).optional(),
  mainNavOrder: z.array(z.string()).optional(),
  mainNavHidden: z.array(z.string()).optional(),
  profitCardStyle: ProfitCardStyleSchema.optional()
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const next = await updateSystemSettingsExtra(body)
  return { ok: true, ...next }
})
