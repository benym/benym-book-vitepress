import type {DefaultTheme} from 'vitepress'
import {getSidebar} from "../utils/getSidebar";

export const sidebarConfig: DefaultTheme.Config['sidebar'] = {
  ["/notes/01-java/"]: [getSidebar("/docs/src", "/notes/01-java/")],
  ["/notes/02-python/"]: [getSidebar("/docs/src", "/notes/02-python/")],
  ["/notes/03-distribution-and-middleware/"]: [getSidebar("/docs/src", "/notes/03-distribution-and-middleware/")],
  ["/notes/05-foundation-framework/"]: [getSidebar("/docs/src", "/notes/05-foundation-framework/")],
  ["/notes/06-algorithm/"]: [getSidebar("/docs/src", "/notes/06-algorithm/")],
  ["/notes/07-practice/"]: [getSidebar("/docs/src", "/notes/07-practice/")],
  ["/notes/08-open-source-project/"]: [getSidebar("/docs/src", "/notes/08-open-source-project/")],
  ["/notes/09-milestone/"]: [getSidebar("/docs/src", "/notes/09-milestone/")],
  ["/notes/10-about/"]: [getSidebar("/docs/src", "/notes/10-about/")],
  ["/notes/11-design-pattern/"]: [getSidebar("/docs/src", "/notes/11-design-pattern/")]
}
