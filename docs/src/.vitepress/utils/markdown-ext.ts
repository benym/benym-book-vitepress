import {MarkdownIt} from 'markdown-it';
import ContainerPlugin from 'markdown-it-container';

export function setupCustomContainers(md: MarkdownIt) {
  // 自定义center容器
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
  // 自定义note容器
  md.use(ContainerPlugin, 'note', {
    validate(params: string) {
      return params.trim().match(/^note\s*(.*)$/);
    },
    render(tokens: any[], idx: number) {
      const m = tokens[idx].info.trim().match(/^note\s*(.*)$/);
      if (tokens[idx].nesting === 1) {
        return '<div class="custom-note">\n';
      } else {
        return '</div>\n';
      }
    }
  });
}
