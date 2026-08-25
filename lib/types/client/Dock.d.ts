import type { KeepaliveUiState } from './store.ts';
export interface DockProps {
    state: KeepaliveUiState;
    now: number;
    onOpenPanel: () => void;
}
export declare function Dock(props: DockProps): React.ReactNode;
//# sourceMappingURL=Dock.d.ts.map