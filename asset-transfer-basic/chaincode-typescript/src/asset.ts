/*
  SPDX-License-Identifier: Apache-2.0
*/

import { Object, Property } from 'fabric-contract-api';

@Object()
export class Accreditation {

    @Property()
    public ID: string;

    @Property()
    public Doctor: string;

    @Property()
    public Clinic: string;

    @Property()
    public Speciality: string;

    @Property()
    public Status: string;
}

