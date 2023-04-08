import { Document, Model, Mongoose, SaveOptions, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as _ from 'lodash';
import ModelsUtils from '../utils/models';
import * as moment from 'moment/moment';

export enum ISignatureType {
  Video = 'video',
  Wallet = 'wallet',
  Otp = 'otp',
}

export enum IAgreeWeStatus {
  Draft = 'draft',
  Review = 'review',
  Signing = 'signing',
  Signed = 'signed',
  Deploying = 'deploying',
  Deployed = 'deployed',
  DeployFailed = 'deployFailed',
}

export enum IBlockchainType {
  Polygon = 'polygon',
  Ethereum = 'ethereum',
  Solana = 'solana',
}

interface IAgreeWe extends Document {
  _id: string;
  status: IAgreeWeStatus;
  owner: string;
  title: string;
  description: string;
  structure: any;
  outline: string;
  image: string;
  signatureType: ISignatureType;
  templateId: string;
  isLegallyBinding: boolean;
  isOnBlockchain: boolean;
  blockchainType: IBlockchainType;
  tombstone: any;
  variableConfig: any;
  agreeweFeeUsd: string;
  agreeweFeeSol: string;
  plugins: any;
  deployedAt: moment.Moment;
  createdAt: moment.Moment;
  updatedAt: moment.Moment;

  reload(tOpts?: object): Promise<IAgreeWe>;

  update(params: object, tOpts?: object): Promise<IAgreeWe>;

  filterKeys(): object;
}

interface IAgreeWeModel extends Model<IAgreeWe> {
  create(rawUser: object, tOpts?: SaveOptions): Promise<any>;

  findByEmail(email: string, tOpts?: SaveOptions): Promise<IAgreeWe>;
}

export default function(mongoose: Mongoose): IAgreeWeModel {

  const agreeWeSchema = new Schema<IAgreeWe>(
    {
      _id: {
        type: Schema.Types.String,
        required: true,
        default: () => uuidv4()
      },
      status: { type: String, enum: [...Object.values(IAgreeWeStatus)] },
      owner: { type: String, default: null },
      title: { type: String, default: null },
      description: { type: String, default: null },
      structure: { type: String, default: null },
      outline: { type: mongoose.Schema.Types.Mixed, default: null },
      image: { type: String, default: null },
      signatureType: { type: String, enum: [...Object.values(ISignatureType)] },
      templateId: { type: String, default: null },
      isLegallyBinding: { type: Boolean, default: false },
      isOnBlockchain: { type: Boolean, default: false },
      blockchainType: { type: String, enum: [...Object.values(IBlockchainType)] },
      tombstone: { type: String, default: null },
      variableConfig: { type: String, default: null },
      agreeweFeeUsd: { type: String, default: null },
      agreeweFeeSol: { type: String, default: null },
      plugins: { type: String, default: null },
      deployedAt: { type: Date, get: ModelsUtils.getter }
    },
    {
      timestamps: true
    }
  );

  agreeWeSchema.index({ createdAt: 1 });

  agreeWeSchema.statics = {
    async create(raw: any, tOpts: SaveOptions): Promise<any> {
      const rawObj = new this(raw);
      return rawObj.save(tOpts);
    }
  };

  agreeWeSchema.methods = {
    async reload(tOpts: SaveOptions) {
      return this.model('user').findOne({ _id: this._id }).exec(tOpts);
    },

    async update(params: any = {}, tOpts: SaveOptions) {
      Object.entries(params).forEach(([key, value]) => {
        if (this.schema.tree[key]) {
          if (!this.schema.tree[key].required || (this.schema.tree[key].required && value)) {
            const parsedObj = this.toObject();

            if (!_.isEqual(parsedObj[key], value)) {
              this[key] = value;
            }
          }
        }
      });

      await this.save(tOpts);

      return this.reload(tOpts);
    },

    filterKeys() {
      const obj = this.toObject();
      const filtered: any = _.pick(obj, '_id', 'disabledAt', 'createdAt');

      return filtered;
    }
  };

  return mongoose.model<IAgreeWe, IAgreeWeModel>('agreeWe', agreeWeSchema);

}

