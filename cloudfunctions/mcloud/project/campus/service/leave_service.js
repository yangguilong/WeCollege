/**
 * Notes: 兼职模块业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2024-03-23 04:00:00 
 */

const BaseProjectService = require('./base_project_service.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const util = require('../../../framework/utils/util.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');
const LeaveModel = require('../model/leave_model.js');
const UserModel = require('../model/user_model.js');

class LeaveService extends BaseProjectService {

	/** 点赞 */
	async likeLeave(userId, id) {
		this.AppError('likeLeave [校园圈]该功能暂不开放');
	}

	/** 浏览 */
	async viewLeave(userId, id) {
		let fields = '*';

		let where = {
			_id: id,
			//LEAVE_STATUS: 1
		}

		if (userId && util.isDefined(where.LEAVE_STATUS)) delete where.LEAVE_STATUS;

		let leave = await LeaveModel.getOne(where, fields);
		if (!leave) return null;

		LeaveModel.inc(id, 'LEAVE_VIEW_CNT', 1);

		return leave;
	}

	/** 获取 */
	async getLeaveDetail(id) {
		return await LeaveModel.getOne(id);
	}

	/**修改状态 */
	async statusLeave(userId, id, status) {
		//this.AppError('statusLeave [校园圈]该功能暂不开放，如有需要请加作者微信：cclinux0730');

		let where = { 
			LEAVE_ID: id,
		}
		if (userId) where.LEAVE_USER_ID = userId; // for  admin

		let data = {
			LEAVE_STATUS: Number(status)
		}
		return await LeaveModel.edit(where, data);		
	}

	/** 删除 */
	async delLeave(userId, id) {
		// this.AppError('delLeave [校园圈]该功能暂不开放，如有需要请加作者微信：cclinux0730');
		let where = {
			LEAVE_ID: id,
		}
		let effect = await LeaveModel.del(where);

		return {
			effect
		};		
	}

	/** 插入 */
	async insertLeave(userId, {
		cateId,
		cateName,
		order,
		forms
	}) {
		// TODO: 判断重复/频繁发布

		// 入库
		let pubTime = timeUtil.time();
		let data = {
			LEAVE_STATUS: 1, // 正常(出售中)
			LEAVE_CATE_ID: cateId,
			LEAVE_CATE_NAME: cateName,
			LEAVE_ORDER: order, // 顺序，用于置顶，小的优先
			//LEAVE_VOUCH: 0,  //?
			LEAVE_USER_ID: userId,
			LEAVE_DAY: timeUtil.timestamp2Time(pubTime, 'Y-M-D h:m'),

			LEAVE_FORMS: forms, // array
			// title, price, desc, poster, tel, wx, pic
			LEAVE_OBJ: dataUtil.dbForms2Obj(forms),

			LEAVE_FAV_CNT: 0,
			LEAVE_VIEW_CNT: 0,
			LEAVE_LIKE_CNT: 0,

			// LEAVE_ADD_TIME: pubTime, // Model.insert() would set this automatically
			// LEAVE_EDIT_TIME: pubTime, // Model.insert() would set this automatically
		}

		return {
			id: await LeaveModel.insert(data),
		}
	}

	/** 修改 */
	async editLeave(userId, {
		id,
		cateId,
		cateName,
		order,
		forms
	}) {
		// this.AppError('editLeave [校园圈]该功能暂不开放，如有需要请加作者微信：cclinux0730');
		let where = {
			LEAVE_ID: id
		}
		let fields = 'LEAVE_ID,LEAVE_STATUS'
		let leave = await LeaveModel.getOne(where, fields);
		if (!leave) return;
		if (leave.LEAVE_STATUS != 1) {
			this.AppError('物品状态错误');
			return;
		}

		let data = {
			LEAVE_CATE_ID: cateId,
			LEAVE_CATE_NAME: cateName,
			LEAVE_ORDER: order, // 顺序，用于置顶，小的优先
			LEAVE_FORMS: forms, // array
			// title, price, desc, poster, tel, wx, pic
			LEAVE_OBJ: dataUtil.dbForms2Obj(forms),
		}
		return await LeaveModel.edit(where, data);
	}

	/** 更新forms信息 */
	async updateLeaveForms({
		id,
		hasImageForms
	}) {
		// this.AppError('updateLeaveForms [校园圈]该功能暂不开放，如有需要请加作者微信：cclinux0730');

		let where = {
			'LEAVE_ID': id
		}
		let fields = 'LEAVE_ID,LEAVE_OBJ';
		let leave = await LeaveModel.getOne(where, fields);
		if (!leave) return;

		let data = {
			LEAVE_OBJ: dataUtil.dbForms2Obj(hasImageForms),
		}

		return await LeaveModel.editForms(where, 'LEAVE_FORMS', 'LEAVE_OBJ', hasImageForms)
	}

	/** 列表与搜索 */
	async getLeaveList(userId, {
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal }) {
		orderBy = orderBy || {
			'LEAVE_ORDER': 'asc',
			'LEAVE_ADD_TIME': 'desc'
		};
		let fields = 'LEAVE_ORDER,LEAVE_CATE_ID,LEAVE_CATE_NAME,LEAVE_STATUS,LEAVE_COMMENT_CNT,LEAVE_VIEW_CNT,LEAVE_FAV_CNT,LEAVE_FAV_LIST,LEAVE_LIKE_CNT,LEAVE_LIKE_LIST,LEAVE_ADD_TIME,LEAVE_USER_ID,LEAVE_OBJ,user.USER_NAME,user.USER_PIC';

		let where = {};
		where.and = {
			//LEAVE_STATUS: 1,
			_pid: this.getProjectId() //复杂的查询在此处标注PID
		};


		if (util.isDefined(search) && search) {
			if (search == '我的发布') {
				where.and.LEAVE_USER_ID = userId;
			}
			else if (search == '我的点赞') {
				where.and.LEAVE_LIKE_LIST = userId;
			}
			else if (search == '我的收藏') {
				where.and.LEAVE_FAV_LIST = userId;
			}
			else {
				where.or = [
					{ 'LEAVE_OBJ.title': ['like', search] },
					{ 'LEAVE_OBJ.poster': ['like', search] },
					{ 'LEAVE_OBJ.tel': ['like', search] },
					{ 'LEAVE_OBJ.wx': ['like', search] }, 
					{ 'LEAVE_OBJ.desc': ['like', search] },
				];
			}

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'cateId': {
					where.and.LEAVE_CATE_ID = String(sortVal);
					break;
				}
				case 'status': {
					where.and.LEAVE_STATUS = Number(sortVal);
					break;
				}
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'LEAVE_ADD_TIME');
					break;
				}
				case 'fav': {
					orderBy = {
						'LEAVE_FAV_CNT': 'desc',
						'LEAVE_ADD_TIME': 'desc'
					}
					break;
				}
				case 'comment': {
					orderBy = {
						'LEAVE_COMMENT_CNT': 'desc',
						'LEAVE_ADD_TIME': 'desc'
					}
					break;
				}
				case 'like': {
					orderBy = {
						'LEAVE_LIKE_CNT': 'desc',
						'LEAVE_ADD_TIME': 'desc'
					}
					break;
				}
				case 'today': {
					where.and.LEAVE_DAY = timeUtil.time('Y-M-D');
					break;
				}
				case 'yesterday': {
					where.and.LEAVE_DAY = timeUtil.time('Y-M-D', -86400);
					break;
				}
			}
		}

		let joinParams = {
			from: UserModel.CL,
			localField: 'LEAVE_USER_ID',
			foreignField: 'USER_MINI_OPENID',
			as: 'user',
		};

		return await LeaveModel.getListJoin(joinParams, where, fields, orderBy, page, size, isTotal, oldTotal);

	}

}

module.exports = LeaveService;