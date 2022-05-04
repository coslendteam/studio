import { Inject, Injectable } from '@nestjs/common';
import { compact, range, uniq } from 'lodash';

import { APP_TOOLKIT, IAppToolkit } from '~app-toolkit/app-toolkit.interface';
import { CacheOnInterval } from '~cache/cache-on-interval.decorator';
import { Network } from '~types/network.interface';

import { PancakeswapContractFactory } from '../contracts';
import { PANCAKESWAP_DEFINITION } from '../pancakeswap.definition';

@Injectable()
export class BinanceSmartChainPancakeswapPoolAddressCacheManager {
  constructor(
    @Inject(APP_TOOLKIT) private readonly appToolkit: IAppToolkit,
    @Inject(PancakeswapContractFactory) protected readonly contractFactory: PancakeswapContractFactory,
  ) {}

  @CacheOnInterval({
    key: `apps-v3:${PANCAKESWAP_DEFINITION.id}:graph-top-pool-addresses`,
    timeout: 15 * 60 * 1000,
  })
  private async getTopPoolAddresses() {
    // @TODO Pull top 1000 pairs from https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2
    // Use sortBy trackedReserveBNB
    return [];
  }

  @CacheOnInterval({
    key: `apps-v3:${PANCAKESWAP_DEFINITION.id}:chef-pool-addresses`,
    timeout: 15 * 60 * 1000,
  })
  private async getChefPoolAddresses() {
    const network = Network.BINANCE_SMART_CHAIN_MAINNET;
    const chefAddress = '0x73feaa1ee314f8c655e354234017be2193c9e24e';
    const chefContract = this.contractFactory.pancakeswapChef({ address: chefAddress, network });

    const provider = this.appToolkit.getNetworkProvider(network);
    const multicall = this.appToolkit.getMulticall(network);
    const numPools = await multicall.wrap(chefContract).poolLength();

    const allAddresses = await Promise.all(
      range(0, Number(numPools)).map(async v => {
        const poolInfo = await multicall.wrap(chefContract).poolInfo(v);
        const lpTokenAddress = poolInfo.lpToken.toLowerCase();
        const lpTokenContract = this.contractFactory.pancakeswapPair({ address: lpTokenAddress, network });

        // Some EOAs exist on the MasterChef contract; calling these breaks multicall
        const code = await provider.getCode(lpTokenAddress);
        if (code === '0x') return false;

        const [symbol, factoryAddressRaw] = await Promise.all([
          multicall
            .wrap(lpTokenContract)
            .symbol()
            .catch(_err => ''),
          multicall
            .wrap(lpTokenContract)
            .factory()
            .catch(_err => ''),
        ]);

        // We've deprecated V1 support since the liquidities are low now (also our zap does not support V1)
        const V2_FACTORY_ADDRESS = '0xca143ce32fe78f1f7019d7d551a6402fc5350c73';
        const isV2Pair = factoryAddressRaw.toLowerCase() === V2_FACTORY_ADDRESS;
        const isCakeLp = symbol === 'Cake-LP';
        if (!isV2Pair || !isCakeLp) return null;

        return lpTokenAddress;
      }),
    );

    return compact(allAddresses);
  }

  @CacheOnInterval({
    key: `apps-v3:${PANCAKESWAP_DEFINITION.id}:static-pool-addresses`,
    timeout: 15 * 60 * 1000,
  })
  private async getStaticPoolAddresses() {
    return ['0x351a295afbab020bc7eedcb7fd5a823c01a95fda'];
  }

  async getPoolAddresses(): Promise<string[]> {
    const [topPoolAddresses, chefPoolAddresses, staticPoolAddresses] = await Promise.all([
      this.getTopPoolAddresses(),
      this.getChefPoolAddresses(),
      this.getStaticPoolAddresses(),
    ]);

    return uniq([...topPoolAddresses, ...chefPoolAddresses, ...staticPoolAddresses]);
  }
}
