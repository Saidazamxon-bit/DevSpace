import { db } from '@/database/db';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import { endOfMonth, startOfMonth } from '@/utils/date';
import { formatMoney } from '@/utils/money';

/** Xarajat qo‘shilgandan keyin tegishli oylik budjet holatini tekshiradi va ogohlantiradi */
export async function checkBudgetAfterExpense(categoryId: string, date: string) {
  const budget = await db.budgets.where('categoryId').equals(categoryId).first();
  if (!budget) return;
  const from = startOfMonth(date);
  const to = endOfMonth(date);
  const txs = await db.transactions.where('categoryId').equals(categoryId).filter((t) => t.type === 'expense' && t.date >= from && t.date <= to).toArray();
  const spent = txs.reduce((s, t) => s + t.amount, 0);
  const pct = (spent / budget.limit) * 100;
  const { budgetWarnPercent, currency, numberFormat } = useSettings.getState();
  const cat = await db.categories.get(categoryId);
  const name = cat?.name ?? 'Kategoriya';
  if (pct > 100) {
    toast.error(`“${name}” budjeti oshib ketdi`, `Limitdan ${formatMoney(spent - budget.limit, { currency, numberFormat })} ortiq sarflandi.`);
  } else if (pct >= budgetWarnPercent) {
    toast.warning(`“${name}” budjeti ${Math.round(pct)}% ga yetdi`, `Qolgan: ${formatMoney(budget.limit - spent, { currency, numberFormat })}`);
  }
}
