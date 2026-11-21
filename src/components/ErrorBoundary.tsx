import { Component, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

interface State {
  error: Error | null;
}

/** Kutilmagan xatoliklarda butun ilova “oq ekran” bo‘lib qolmasligi uchun */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[Personal Finance]', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="card max-w-md text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-expense/10 text-expense">
            <TriangleAlert size={22} />
          </span>
          <h1 className="mt-4 text-lg font-semibold">Kutilmagan xatolik yuz berdi</h1>
          <p className="mt-2 text-sm text-muted">
            Ma’lumotlaringiz xavfsiz — ular qurilmada saqlangan. Sahifani qayta yuklab ko‘ring.
          </p>
          <p className="mt-3 rounded-xl bg-surface-2 p-2 text-left font-mono text-[12px] text-muted break-words">{this.state.error.message}</p>
          <button className="btn btn-primary mt-5" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Qayta yuklash
          </button>
        </div>
      </div>
    );
  }
}
