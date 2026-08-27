import Header from './components/header';
import styles from './index.module.scss';
import Loading from '@/components/loading';
import { ErrorBlock, Image, Swiper } from '@/bases';
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
        <Swiper autoplay loop style={{ '--border-radius': '12px', '--height': '200px' }}>
          {data.banner.map((item, index) => {
            return (
              <Swiper.Item key={index}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center center', // 居中裁剪
                    }}
                  />
                </div>
              </Swiper.Item>
            );
          })}
        </Swiper>
        <Navbar />
        <Popular books={data.popular} />
        <Recommend books={data.recommend} />
        <LimitedReader books={data.limited} />
        <Ranking rankings={data.ranking} />
      </Space>
    </div>
  );
}
