import InternalSidebar from '@/bases/sidebar/sidebar';
import SidebarItem from '@/bases/sidebar/sidebar-item';

export type { SidebarProps } from '@/bases/sidebar/sidebar';
export type { SidebarItemProps } from '@/bases/sidebar/sidebar-item';

type InternalSidebarType = typeof InternalSidebar;

export interface SidebarInterface extends InternalSidebarType {
  Item: typeof SidebarItem;
}

const Sidebar = InternalSidebar as SidebarInterface;

Sidebar.Item = SidebarItem;

export default Sidebar;
