import { Inject } from '@nestjs/common';
import { compact } from 'lodash';

import { Register } from '~app-toolkit/decorators';
import { PositionFetcher } from '~position/position-fetcher.interface';
import { AppTokenPosition } from '~position/position.interface';
import { Network } from '~types/network.interface';

import { BASTION_PROTOCOL_DEFINITION } from '../bastion-protocol.definition';
import { BastionSupplyTokenHelper } from '../helper/bastion-protocol.supply.token-helper';

const appId = BASTION_PROTOCOL_DEFINITION.id;
const groupId = BASTION_PROTOCOL_DEFINITION.groups.supplyMultichain.id;
const network = Network.AURORA_MAINNET;

@Register.TokenPositionFetcher({ appId, groupId, network })
export class AuroraBastionProtocolSupplyMultichainTokenFetcher implements PositionFetcher<AppTokenPosition> {
  constructor(@Inject(BastionSupplyTokenHelper) private readonly bastionSupplyTokenHelper: BastionSupplyTokenHelper) {}
  async getPositions() {
    const tokens = await this.bastionSupplyTokenHelper.getTokens({
      comptrollerAddress: '0xA195b3d7AA34E47Fb2D2e5A682DF2d9EFA2daF06',
      realmName: 'Multichain Realm',
      network,
      appId,
      groupId,
    });

    return compact(tokens);
  }
}
