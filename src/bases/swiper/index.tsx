import InternalSwiper from '@/bases/swiper/swiper';
import SwiperItem from '@/bases/swiper/swiper-item';

export type { SwiperProps } from '@/bases/swiper/swiper';
export type { SwiperItemProps } from '@/bases/swiper/swiper-item';

type InternalSwiperType = typeof InternalSwiper;

export interface SwiperInterface extends InternalSwiperType {
  Item: typeof SwiperItem;
}

const Swiper = InternalSwiper as SwiperInterface;

Swiper.Item = SwiperItem;

export default Swiper;
