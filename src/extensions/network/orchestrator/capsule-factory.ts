/* eslint-disable dot-notation */
import { Capsule, ContainerFactory, Exec, State } from '@teambit/capsule';
import { AnyFS, NodeFS } from '@teambit/any-fs';
import { EventEmitter } from 'events';
import { ResourceFactory, Resource } from './resource-pool';
import CapsuleResource from './capsule-resource';
import { BitContainerConfig } from '../../capsule/component-capsule';
import { CapsuleOptions } from './types';

export default class CapsuleFactory<T extends Capsule<Exec, AnyFS>> extends EventEmitter implements ResourceFactory<T> {
  constructor(
    private bitContainerFactory: ContainerFactory<Exec, AnyFS>,
    private createFn: (
      containerFactory: ContainerFactory<Exec, AnyFS>,
      volume?: AnyFS,
      config?: CapsuleOptions,
      initialState?: State,
      console?: Console
    ) => Promise<T>,
    private obtainFn: (containerFactory: ContainerFactory<Exec, AnyFS>, raw: string) => Promise<T>
  ) {
    super();
  }

  async create(config: CapsuleOptions): Promise<Resource<T>> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const capsule: T = await this.createFn(this.bitContainerFactory, new NodeFS(config.wrkDir!), config);
    (capsule as any)._bitId = config.bitId;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await capsule.start();
    return new CapsuleResource(capsule, config);
  }

  async obtain(raw: string): Promise<Resource<T>> {
    const capsule: T = await this.obtainFn(this.bitContainerFactory, raw);
    return new CapsuleResource(capsule, {});
  }
}
