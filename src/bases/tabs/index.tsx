import InternalTabs from '@/bases/tabs/tabs';
import Tab from '@/bases/tabs/tab';

export type { TabsProps } from '@/bases/tabs/tabs';
export type { TabProps } from '@/bases/tabs/tab';

type InternalTabsType = typeof InternalTabs;

export interface TabsInterface extends InternalTabsType {
  Tab: typeof Tab;
}

const Tabs = InternalTabs as TabsInterface;

Tabs.Tab = Tab;
export default Tabs;
