import InternalGrid from '@/bases/grid/grid';
import GridItem from '@/bases/grid/grid-item';

export type { GridProps } from '@/bases/grid/grid';
export type { GridItemProps } from '@/bases/grid/grid-item';

type InternalGridType = typeof InternalGrid;

export interface GridInterface extends InternalGridType {
  Item: typeof GridItem;
}

const Grid = InternalGrid as GridInterface;
Grid.Item = GridItem;

export default Grid;
