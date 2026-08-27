import React from "react"
import styles from './index.module.scss'
import DetailNavbar from "./components/detailNavbar"
import DetailBookInfo from "./components/detailBookInfo"
import { Divider } from "@/bases"
import Catalog from "./components/detailCatalog"

const DetailHeader:React.FC = React.memo(() => {

  return(
    <div className={styles.header}>
      <DetailNavbar />
      <DetailBookInfo />
      <Divider />
      <Catalog />
    </div>
  )
})

export default DetailHeader;