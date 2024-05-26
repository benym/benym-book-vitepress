import { MarkdownIt } from 'markdown-it';
import ContainerPlugin from 'markdown-it-container';

export function setupCustomContainers(md: MarkdownIt) {
  md.use(ContainerPlugin, 'center', {
    validate(params: string) {
      return params.trim().match(/^center\s*(.*)$/);
    },
    render(tokens: any[], idx: number) {
      const m = tokens[idx].info.trim().match(/^center\s*(.*)$/);
      if (tokens[idx].nesting === 1) {
        return '<div class="center-container" style="text-align: center;">\n';
      } else {
        return '</div>\n';
      }
    }
  });
}
