import type { KeepaliveStore, KeepaliveUiState } from './store.ts';
import type { ProviderConfig, ProviderStatus } from '../types.ts';
export declare function ProviderCard(props: {
    id: string;
    name: string;
    registered: boolean;
    entry: ProviderConfig | undefined;
    row: ProviderStatus | undefined;
    state: KeepaliveUiState;
    store: KeepaliveStore;
    now: number;
}): React.ReactNode;
//# sourceMappingURL=ProviderCard.d.ts.map