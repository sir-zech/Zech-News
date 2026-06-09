import { Pipe, PipeTransform } from '@angular/core';
import { NewsService } from '../services/news';

/** Routes a thumbnail through the free wsrv.nl CDN (resize + WebP + cache). */
@Pipe({ name: 'imgproxy', standalone: true })
export class ImgProxyPipe implements PipeTransform {
  transform(url: string | null | undefined, width = 400): string {
    return NewsService.proxyImage(url || '', width);
  }
}

/** Google favicon for a URL's domain. */
@Pipe({ name: 'favicon', standalone: true })
export class FaviconPipe implements PipeTransform {
  transform(url: string | null | undefined, size = 64): string {
    return NewsService.favicon(url || '', size);
  }
}
