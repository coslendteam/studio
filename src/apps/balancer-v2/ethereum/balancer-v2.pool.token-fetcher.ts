import { Inject } from '@nestjs/common';

import { Register } from '~app-toolkit/decorators';
import { PositionFetcher } from '~position/position-fetcher.interface';
import { AppTokenPosition } from '~position/position.interface';
import { Network } from '~types/network.interface';

import { BALANCER_V2_DEFINITION } from '../balancer-v2.definition';
import { BalancerV2PoolTokensHelper } from '../helpers/balancer-v2.pool.token-helper';
import { BalancerV2TheGraphPoolTokenDataStrategy } from '../helpers/balancer-v2.the-graph.pool-token-address-strategy';

const appId = BALANCER_V2_DEFINITION.id;
const groupId = BALANCER_V2_DEFINITION.groups.pool.id;
const network = Network.ETHEREUM_MAINNET;

@Register.TokenPositionFetcher({ appId, groupId, network })
export class EthereumBalancerV2PoolTokenFetcher implements PositionFetcher<AppTokenPosition> {
  constructor(
    @Inject(BalancerV2PoolTokensHelper) private readonly poolTokensHelper: BalancerV2PoolTokensHelper,
    @Inject(BalancerV2TheGraphPoolTokenDataStrategy)
    private readonly balancerV2TheGraphPoolTokenDataStrategy: BalancerV2TheGraphPoolTokenDataStrategy,
  ) {}

  getPositions() {
    return this.poolTokensHelper.getPositions({
      network,
      appId,
      groupId,
      appTokenDependencies: [
        { appId: BALANCER_V2_DEFINITION.id, groupIds: [BALANCER_V2_DEFINITION.groups.wrappedAave.id], network },
      ],
      vaultAddress: '0xba12222222228d8ba445958a75a0704d566bf2c8',
      resolvePoolTokenAddresses: this.balancerV2TheGraphPoolTokenDataStrategy.build({
        subgraphUrl: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
      }),
    });
  }
}
