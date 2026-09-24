import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
export interface MenuItemShape {
    id: string;
    label: ReactNode;
    disabled?: boolean;
    icon?: ReactNode;
    danger?: boolean;
}
export interface PrimitivesModule {
    readonly Button: (props: {
        variant?: 'primary' | 'ghost' | 'outline' | 'toolbar';
        size?: 'md' | 'sm';
        icon?: ReactNode;
        className?: string;
        children?: ReactNode;
    } & ButtonHTMLAttributes<HTMLButtonElement>) => ReactNode;
    readonly Pill: (props: {
        active?: boolean;
        className?: string;
        children?: ReactNode;
    } & ButtonHTMLAttributes<HTMLButtonElement>) => ReactNode;
    readonly Input: (props: {
        icon?: ReactNode;
        className?: string;
    } & InputHTMLAttributes<HTMLInputElement>) => ReactNode;
    readonly StateDot: (props: {
        state: 'done' | 'warning' | 'ongoing' | 'error';
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly Menu: (props: {
        open: boolean;
        anchor: ReactNode;
        items: readonly MenuItemShape[];
        selectedId?: string;
        onSelect: (id: string) => void;
        onClose: () => void;
        align?: 'start' | 'end';
        side?: 'bottom' | 'top' | 'right';
        portal?: boolean;
        className?: string;
    }) => ReactNode;
    readonly DisclosureRow: (props: {
        icon: ReactNode;
        title: string;
        open: boolean;
        expandable: boolean;
        onToggle: () => void;
        expandOnRowClick?: boolean;
        keepContentWhenOpen?: boolean;
        collapsedContent?: ReactNode;
        children?: ReactNode;
        className?: string;
        rowClassName?: string;
        titleClassName?: string;
    }) => ReactNode;
    readonly Toast: (props: {
        text: string;
        icon?: ReactNode;
        onDone: () => void;
    }) => ReactNode;
    readonly RiskConfirmation: (props: {
        open: boolean;
        title: string;
        description: string;
        acknowledgeLabel: string;
        cancelLabel: string;
        confirmLabel: string;
        acknowledged: boolean;
        disabled?: boolean;
        onAcknowledgedChange: (acknowledged: boolean) => void;
        onCancel: () => void;
        onConfirm: () => void;
    }) => ReactNode;
    readonly MessageText: (props: {
        text: string;
    }) => ReactNode;
    readonly IconPlusOutline16: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly IconCheckOutline16: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly IconCheckOutline14: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly IconChevronDownOutline14: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly IconEllipsisOutline16: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly IconTrashOutline16: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly IconSendOutline16: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly IconPlayOutline16: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly IconPauseOutline16: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly IconRefreshOutline16: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly IconClockOutline16: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
    readonly IconWarningOutline16: (props: {
        size?: number;
        className?: string;
    }) => ReactNode;
}
/**
 * Loaded once at module evaluation; null only when the host omits the module.
 * Normalized ACROSS host generations: 0.1.7 renamed the icon exports
 * (*14/*16 -> *Regular/*Medium) and replaced MessageText with MarkdownText
 * (whose labels prop is required), so every concept resolves through a
 * pick()-chain (new name first, old name for legacy hosts) and the message
 * renderer gains a minimal labels adapter when only MarkdownText exists.
 */
export declare const P: PrimitivesModule | null;
/**
 * Non-null view for components rendered BELOW the SettingsTab availability
 * gate: the gate renders one error state and never mounts children when P is
 * null, so U is safe to use unguarded in leaf components.
 */
export declare const U: PrimitivesModule;
//# sourceMappingURL=primitives.d.ts.map