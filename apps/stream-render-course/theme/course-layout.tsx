import { Layout as OriginalLayout, type LayoutProps } from '@rspress/core/theme-original'

import { ChapterCheckpoint } from './chapter-checkpoint'
import { CourseBrand, ProductNav } from './course-nav'
import { CourseRail } from './course-rail'

export function Layout(props: LayoutProps) {
  return (
    <OriginalLayout
      {...props}
      navTitle={<CourseBrand />}
      afterNavTitle={
        <>
          <ProductNav />
          {props.afterNavTitle}
        </>
      }
      beforeSidebar={
        <>
          <CourseRail />
          {props.beforeSidebar}
        </>
      }
      beforeDocContent={props.beforeDocContent}
      beforeOutline={
        <>
          <ChapterCheckpoint />
          {props.beforeOutline}
        </>
      }
    />
  )
}
