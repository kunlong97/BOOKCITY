import { useState } from 'react';
import Header from './components/header';
import styles from './index.module.scss';
import Loading from '@/components/loading';
import ErrorBlock from '@/bases/error-block';
import Image from '@/bases/image';
import Swiper from '@/bases/swiper';
import Navbar from './components/navbar';
import Space from '@/bases/space';
import { px2rem } from '@/utils/unit';
import Popular from './components/popular';
import Recommend from './components/recommend';
import LimitedReader from './components/limitedReade';
import Ranking from '@/pages/home/components/ranking';
import useHomeData from './hooks/useHomeData';

/**
 * Popular / Recommend / LimitedReader / Ranking 都是 Home 的直接子组件，
 * 中间没有像 detail 页面 DetailHeader 那样"自己不关心数据、只负责组合子组件"
 * 的穿透层——所以这里不需要 Context，请求一次之后直接把各自要用的那一小片数据
 * 当 props 传下去就够了：谁需要什么，一眼就能从这个组件的 props 类型看出来，
 * 比"随便 useContext 一下、自己再从一个大对象里挑字段"更明确。
 * Context 该解决的是"数据要穿过不关心它的中间组件"这个问题，这里根本不存在
 * 这个问题，用 Context 反而是多引入一层不必要的间接。
 */
export default function Home() {
  const { data, loading, error } = useHomeData();
  // 第一张轮播图下载完（或失败）之前，后面几张先不下载，避免和首屏图片抢带宽
  const [firstBannerDone, setFirstBannerDone] = useState(false);
  const onFirstBannerDone = () => setFirstBannerDone(true);

  if (error) {
    return <ErrorBlock />;
  }
  if (loading || !data) {
    return <Loading />;
  }

  return (
    <div className={styles.home}>
      <Header />
      <Space direction="vertical" gap={px2rem(20)}>
        {data?.banner?.length && (
          <Swiper autoplay loop style={{ '--border-radius': px2rem(12), '--height': px2rem(200) }}>
            {data.banner.map((item, index) => {
              return (
                <Swiper.Item key={index}>
                  {/*
                    第一张直接加载（地址在 index.html 里已经预加载过）。
                    后面几张懒加载：第一张加载完后再开始下载；如果在那之前就被划到了，
                    Image 的懒加载会在它进入可见区域时立刻下载
                  */}
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fit="cover"
                    lazy={index > 0 && !firstBannerDone}
                    onLoad={index === 0 ? onFirstBannerDone : undefined}
                    onError={index === 0 ? onFirstBannerDone : undefined}
                  />
                </Swiper.Item>
              );
            })}
          </Swiper>
        )}
        <Navbar />
        {data?.popular?.length > 0 && <Popular books={data.popular} />}
        {data?.recommend?.length > 0 && <Recommend books={data.recommend} />}
        {data?.limited?.length > 0 && <LimitedReader books={data.limited} />}
        {data?.ranking?.length > 0 && <Ranking rankings={data.ranking} />}
      </Space>
    </div>
  );
}
