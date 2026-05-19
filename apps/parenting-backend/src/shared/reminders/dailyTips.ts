type Logger = { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void };

export type DailyTipsDispatchResult = { sent: number };

export const dispatchDailyTips = async (
  _logger: Logger,
): Promise<DailyTipsDispatchResult> => {
  return { sent: 0 };
};
