/**
 * Single boundary to the host UI primitives served through the client
 * module table. Hard dependency (spec D2): when the host does not serve the
 * module the whole tab renders ONE error state; there are no per-component
 * fallbacks. Structural types below mirror the served surface (spec F3);
 * the package cannot be installed as a dependency (spec F2), so types are
 * vendored here.
 */
import { createElement } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export interface MenuItemShape {
  id: string
  label: ReactNode
  disabled?: boolean
  icon?: ReactNode
  danger?: boolean
}

export interface PrimitivesModule {
  readonly Button: (props: {
    variant?: 'primary' | 'ghost' | 'outline' | 'toolbar'
    size?: 'md' | 'sm'
    icon?: ReactNode
    className?: string
    children?: ReactNode
  } & ButtonHTMLAttributes<HTMLButtonElement>) => ReactNode
  readonly Pill: (props: {
    active?: boolean
    className?: string
    children?: ReactNode
  } & ButtonHTMLAttributes<HTMLButtonElement>) => ReactNode
  readonly Input: (props: {
    icon?: ReactNode
    className?: string
  } & InputHTMLAttributes<HTMLInputElement>) => ReactNode
  readonly StateDot: (props: {
    state: 'done' | 'warning' | 'ongoing' | 'error'
    size?: number
    className?: string
  }) => ReactNode
  readonly Menu: (props: {
    open: boolean
    anchor: ReactNode
    items: readonly MenuItemShape[]
    selectedId?: string
    onSelect: (id: string) => void
    onClose: () => void
    align?: 'start' | 'end'
    side?: 'bottom' | 'top' | 'right'
    portal?: boolean
    className?: string
  }) => ReactNode
  readonly DisclosureRow: (props: {
    icon: ReactNode
    title: string
    open: boolean
    expandable: boolean
    onToggle: () => void
    expandOnRowClick?: boolean
    keepContentWhenOpen?: boolean
    collapsedContent?: ReactNode
    children?: ReactNode
    className?: string
    rowClassName?: string
    titleClassName?: string
  }) => ReactNode
  readonly Toast: (props: {
    text: string
    icon?: ReactNode
    onDone: () => void
  }) => ReactNode
  readonly RiskConfirmation: (props: {
    open: boolean
    title: string
    description: string
    acknowledgeLabel: string
    cancelLabel: string
    confirmLabel: string
    acknowledged: boolean
    disabled?: boolean
    onAcknowledgedChange: (acknowledged: boolean) => void
    onCancel: () => void
    onConfirm: () => void
  }) => ReactNode
  readonly MessageText: (props: { text: string }) => ReactNode
  readonly IconPlusOutline16: (props: { size?: number; className?: string }) => ReactNode
  readonly IconCheckOutline16: (props: { size?: number; className?: string }) => ReactNode
  readonly IconCheckOutline14: (props: { size?: number; className?: string }) => ReactNode
  readonly IconChevronDownOutline14: (props: { size?: number; className?: string }) => ReactNode
  readonly IconEllipsisOutline16: (props: { size?: number; className?: string }) => ReactNode
  readonly IconTrashOutline16: (props: { size?: number; className?: string }) => ReactNode
  readonly IconSendOutline16: (props: { size?: number; className?: string }) => ReactNode
  readonly IconPlayOutline16: (props: { size?: number; className?: string }) => ReactNode
  readonly IconPauseOutline16: (props: { size?: number; className?: string }) => ReactNode
  readonly IconRefreshOutline16: (props: { size?: number; className?: string }) => ReactNode
  readonly IconClockOutline16: (props: { size?: number; className?: string }) => ReactNode
  readonly IconWarningOutline16: (props: { size?: number; className?: string }) => ReactNode
}

/**
 * Loaded once at module evaluation; null only when the host omits the module.
 * Normalized ACROSS host generations: 0.1.7 renamed the icon exports
 * (*14/*16 -> *Regular/*Medium) and replaced MessageText with MarkdownText
 * (whose labels prop is required), so every concept resolves through a
 * pick()-chain (new name first, old name for legacy hosts) and the message
 * renderer gains a minimal labels adapter when only MarkdownText exists.
 */
export const P: PrimitivesModule | null = (() => {
  try {
    const mod = require('@deepseek-ai/dsh-client-ui-primitives') as Record<string, unknown>
    const pick = (...names: string[]): ((props: never) => ReactNode) => {
      for (const name of names) {
        const found = mod[name]
        // Accept plain components AND memo/forwardRef exotic components
        // (0.1.7 serves e.g. DisclosureRow/MarkdownText as memo objects,
        // which are typeof 'object', not 'function').
        if (typeof found === 'function' || (typeof found === 'object' && found !== null && '$$typeof' in found)) {
          return found as (props: never) => ReactNode
        }
      }
      return undefined as unknown as (props: never) => ReactNode
    }
    const markdownText = pick('MarkdownText')
    const messageText: PrimitivesModule['MessageText'] = mod.MessageText !== undefined
      ? pick('MessageText') as unknown as PrimitivesModule['MessageText']
      : (props) => createElement(markdownText as unknown as React.ComponentType<{ text: string, labels: { code: { copyLabel: string, copiedLabel: string }, footnotes: string } }>, {
          text: props.text,
          labels: { code: { copyLabel: '复制', copiedLabel: '已复制' }, footnotes: '脚注' }
        })
    return {
      Button: pick('Button'),
      Pill: pick('Pill'),
      Input: pick('Input'),
      StateDot: pick('StateDot'),
      Menu: pick('Menu'),
      DisclosureRow: pick('DisclosureRow'),
      Toast: pick('Toast'),
      RiskConfirmation: pick('RiskConfirmation'),
      MessageText: messageText,
      IconPlusOutline16: pick('IconPlusOutlineMedium', 'IconPlusOutline16'),
      IconCheckOutline16: pick('IconCheckOutlineMedium', 'IconCheckOutline16'),
      IconCheckOutline14: pick('IconCheckOutlineRegular', 'IconCheckOutline14'),
      IconChevronDownOutline14: pick('IconChevronDownOutlineRegular', 'IconChevronDownOutline14'),
      IconEllipsisOutline16: pick('IconEllipsisOutlineMedium', 'IconEllipsisOutline16'),
      IconTrashOutline16: pick('IconTrashOutlineMedium', 'IconTrashOutline16'),
      IconSendOutline16: pick('IconSendOutlineMedium', 'IconSendOutline16'),
      IconPlayOutline16: pick('IconPlayOutlineMedium', 'IconPlayOutline16'),
      IconPauseOutline16: pick('IconPauseOutlineMedium', 'IconPauseOutline16'),
      IconRefreshOutline16: pick('IconRefreshOutlineMedium', 'IconRefreshOutline16'),
      IconClockOutline16: pick('IconClockOutlineMedium', 'IconClockOutline16'),
      IconWarningOutline16: pick('IconWarningOutlineMedium', 'IconWarningOutline16')
    } as unknown as PrimitivesModule
  } catch {
    return null
  }
})()

/**
 * Non-null view for components rendered BELOW the SettingsTab availability
 * gate: the gate renders one error state and never mounts children when P is
 * null, so U is safe to use unguarded in leaf components.
 */
export const U: PrimitivesModule = P as PrimitivesModule
