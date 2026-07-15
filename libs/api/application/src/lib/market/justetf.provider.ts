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

      // Fallback for synthetic ETFs tracking major indices that hide their exposure
      if (Object.keys(geography).length === 0) {
        if (isin === 'LU1681043599' || isin === 'FR0010315770' || isin === 'FR0011550185') {
          // MSCI World (CW8) or S&P 500 (ESE, PE500)
          geography['United States'] = 0.70;
          if (isin !== 'FR0010315770' && isin !== 'FR0011550185') {
            geography['Japan'] = 0.06;
            geography['United Kingdom'] = 0.04;
            geography['France'] = 0.03;
          } else {
            geography['United States'] = 1.0;
          }
        } else if (isin === 'LU1681045370') {
          // MSCI Emerging Markets (PAEEM)
          geography['China'] = 0.25;
          geography['India'] = 0.16;
          geography['Taiwan'] = 0.16;
          geography['South Korea'] = 0.12;
          geography['Brazil'] = 0.05;
        } else if (isin === 'LU1861134382') {
          // STOXX Europe 600 (ETZ)
          geography['United Kingdom'] = 0.22;
          geography['France'] = 0.17;
          geography['Switzerland'] = 0.15;
          geography['Germany'] = 0.13;
        }
      }

      return { geography, sector };
    } catch (err) {
      this.logger.error(`Failed to fetch JustETF exposure for ${isin}`, err);
      return { geography: {}, sector: {} };
    }
  }

  async fetchMetadata(isin: string): Promise<{ ter: number | null; repli: string | null; distrib: string | null; issuer: string | null }> {
    try {
      const html = await this.fetchUrl(`https://www.justetf.com/en/etf-profile.html?isin=${isin}`);
      const $ = cheerio.load(html);

      const terText = $('[data-testid="tl_etf-basics_value_ter"]').text().trim();
      const ter = this.parsePct(terText) * 100; // parsePct returns a fraction, multiply by 100 to get percentage points. But wait, `0.14% p.a.` -> parsePct gives 0.0014 * 100 = 0.14. Perfect.

      const repliRaw = $('[data-testid="tl_etf-basics_value_replication-method"]').text().trim().toLowerCase();
      let repli: string | null = null;
      if (repliRaw.includes('physical')) repli = 'Physique';
      if (repliRaw.includes('unfunded swap') || repliRaw.includes('synthetic')) repli = 'Synthétique';

      const distribRaw = $('[data-testid="tl_etf-basics_value_distribution-policy"]').text().trim().toLowerCase();
      let distrib: string | null = null;
      if (distribRaw.includes('accumulating')) distrib = 'Capitalisant';
      if (distribRaw.includes('distributing')) distrib = 'Distribuant';

      const issuer = $('[data-testid="tl_etf-basics_value_fund-provider"]').text().trim() || null;

      return {
        ter: ter > 0 ? ter : null,
        repli,
        distrib,
        issuer,
      };
    } catch (err) {
      this.logger.error(`Failed to fetch JustETF metadata for ${isin}`, err);
      return { ter: null, repli: null, distrib: null, issuer: null };
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
