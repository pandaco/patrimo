import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import * as https from 'https';

@Injectable()
export class JustEtfProvider {
  private readonly logger = new Logger(JustEtfProvider.name);

  async fetchExposure(isin: string): Promise<{ geography: Record<string, number>; sector: Record<string, number> }> {
    try {
      const html = await this.fetchUrl(`https://www.justetf.com/en/etf-profile.html?isin=${isin}`);
      const $ = cheerio.load(html);

      const geography: Record<string, number> = {};
      $('tr[data-testid="etf-holdings_countries_row"]').each((i, el) => {
        const name = $(el).find('[data-testid="tl_etf-holdings_countries_value_name"]').text().trim();
        const pct = $(el).find('[data-testid="tl_etf-holdings_countries_value_percentage"]').text().trim();
        if (name && name.toLowerCase() !== 'other') {
          geography[name] = this.parsePct(pct);
        }
      });

      const sector: Record<string, number> = {};
      $('tr[data-testid="etf-holdings_sectors_row"]').each((i, el) => {
        const name = $(el).find('[data-testid="tl_etf-holdings_sectors_value_name"]').text().trim();
        const pct = $(el).find('[data-testid="tl_etf-holdings_sectors_value_percentage"]').text().trim();
        if (name && name.toLowerCase() !== 'other') {
          sector[name] = this.parsePct(pct);
        }
      });

      return { geography, sector };
    } catch (err) {
      this.logger.error(`Failed to fetch JustETF exposure for ${isin}`, err);
      return { geography: {}, sector: {} };
    }
  }

  private fetchUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  private parsePct(str: string): number {
    if (!str) return 0;
    const clean = str.replace('%', '').trim().replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val / 100;
  }
}
