
export interface SidebarItemProps{

   /** 菜单项的唯一标识符*/
  key: string;

  /** 菜单项的显示标题 */
  title?: React.ReactNode;

  /**子节点内容。*/
  children?: React.ReactNode;
}


const SidebarItem:React.FC<SidebarItemProps> = (props) => {

  return props.children ? (props.children as React.ReactElement) : null;
}

SidebarItem.displayName = 'SidebarItem'; 

export default SidebarItem;