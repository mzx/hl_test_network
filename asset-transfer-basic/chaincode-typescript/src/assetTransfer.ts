import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { Accreditation } from './asset';

@Info({title: 'AssetTransfer', description: 'Smart contract for trading assets'})
export class AssetTransferContract extends Contract {

    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        const assets: Accreditation[] = [
            {
                ID: 'acc1',
                Clinic: 'Barbara Davis Center',
                Doctor: 'Jane Doe',
                Status: 'Applied',
                Speciality: 'Ophthalmology',
            },
            {
                ID: 'acc2',
                Clinic: 'Lucile Packard Pediatric Hospital',
                Doctor: 'Jane Doe',
                Status: 'Applied',
                Speciality: 'Ophthalmology',
            },
            {
                ID: 'acc3',
                Clinic: 'Barbara Davis Center',
                Doctor: 'Jack Brown',
                Status: 'Applied',
                Speciality: 'Medical Genetics and Genomics',
            },
        ];

        for (const asset of assets) {
            await ctx.stub.putState(asset.ID, Buffer.from(JSON.stringify(asset)));
            console.info(`Asset ${asset.ID} initialized`);
        }
    }

    @Transaction()
    public async CreateAsset(ctx: Context, ID: string, Clinic: string, Doctor: string, Status: string, Speciality: string): Promise<void> {
        const asset = {
            ID, Clinic, Doctor, Status: 'Applied', Speciality,
        };
        await ctx.stub.putState(ID, Buffer.from(JSON.stringify(asset)));
    }

    @Transaction(false)
    public async ReadAsset(ctx: Context, id: string): Promise<string> {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    @Transaction()
    public async UpdateAsset(ctx: Context, ID: string, Clinic: string, Doctor: string, Status: string, Speciality: string): Promise<void> {
        const exists = await this.AssetExists(ctx, ID);
        if (!exists) {
            throw new Error(`The asset ${ID} does not exist`);
        }

        // overwriting original asset with new asset
        const asset = {
            ID, Clinic, Doctor, Status, Speciality,
        };
        return ctx.stub.putState(ID, Buffer.from(JSON.stringify(asset)));
    }

    @Transaction()
    public async DeleteAsset(ctx: Context, id: string): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    @Transaction(false)
    @Returns('boolean')
    public async AssetExists(ctx: Context, id: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    @Transaction()
    public async UpdateStatus(ctx: Context, ID: string, Status: string): Promise<void> {
        const assetString = await this.ReadAsset(ctx, ID);
        const asset = JSON.parse(assetString);
        asset.Status = Status;
        await ctx.stub.putState(ID, Buffer.from(JSON.stringify(asset)));
    }

    @Transaction(false)
    @Returns('string')
    public async GetAllAssets(ctx: Context): Promise<string> {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({Key: result.value.key, Record: record});
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    @Transaction(false)
    @Returns('string')
    public async GetAssetHistory(ctx: Context, id: string): Promise<string> {
        const resultsIterator = await ctx.stub.getHistoryForKey(id);
        const results = await this.GetAllResults(resultsIterator, true);

        return JSON.stringify(results);
    }

    private async GetAllResults(iterator, isHistory) {
        const allResults = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                const jsonRes: any = {};
                console.log(res.value.value.toString('utf8'));
                if (isHistory && isHistory === true) {
                    jsonRes.TxId = res.value.tx_id;
                    jsonRes.Timestamp = res.value.timestamp;
                    try {
                        jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        console.log(err);
                        jsonRes.Value = res.value.value.toString('utf8');
                    }
                } else {
                    jsonRes.Key = res.value.key;
                    try {
                        jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        console.log(err);
                        jsonRes.Record = res.value.value.toString('utf8');
                    }
                }
                allResults.push(jsonRes);
            }
            res = await iterator.next();
        }
        iterator.close();
        return allResults;
    }

}
