/**
 * 提供stringformat帮助
 * author:caichenghh
 * date:2018/01/19
 */
String.prototype.format = function(args) {
    var result = this;
    if (arguments.length > 0) {    
        if (arguments.length == 1 && typeof (args) == "object") {
            for (var key in args) {
                if(args[key]!=undefined){
                    var reg = new RegExp("({" + key + "})", "g");
                    result = result.replace(reg, args[key]);
                }
            }
        }
        else {
            for (var i = 0; i < arguments.length; i++) {
                if (arguments[i] != undefined) {
                    var reg = new RegExp("({)" + i + "(})", "g");
                    result = result.replace(reg, arguments[i]);
                }
            }
        }
    }
    return result;
}

/**
 * 分装webuploader,基本上传服务
 * author:caichenghh
 * date:2018/01/19
 */
function BaseUploader(uploadparams,params){
	this.filemap={};
	this.uploader=null;
	this.params=params;
	var _this=this;
	
	//创建上传实践
	WebUploader.Uploader.register({
		name: 'custom',
		//上传文件前执行
		beforeSendFile:function(file){
			var deferred = WebUploader.Deferred();    
	        //1、计算文件的唯一标记fileMd5，用于断点续传
	        (new WebUploader.Uploader()).md5File(file,0,10*1024*1024).progress(function(percentage){
	        	//if(params.tipClassName!=null)
	            	//$('#'+file.id ).find(params.tipClassName).html('正在读取文件信息');  
	        })    
	        .then(function(val){	             
	        	_this.filemap[file.id]=val;	//记录md5
	        	
	        	if(_this.params.beforeSendFile!=null){
	        		_this.params.beforeSendFile(file);	//执行一个上传前的回调
	        	}
	        	
	            //获取文件信息后进入下一步    
	            deferred.resolve();
	         });
	         return deferred.promise(); 
		},
		beforeSend:function(block){
			if(params.blockCheckUrl==null||params.blockCheckUrl=='')
				return;
			var id=$('#'+block.file.id).attr(params.fileIdAttr);
			var deferred = WebUploader.Deferred();	
			var postData={
				filemd5:_this.filemap[block.file.id]
				,chunk:block.chunk
				,chunkSize:block.end-block.start
				,fileId:id
			}
			//上传文件前判断块是否存在
			$.ajax({
			    url: params.blockCheckUrl,
			    type: "POST",
			    data:postData,
			    dataType: 'JSON',
			    beforeSend: function (xhr) {  
			        //xhr.setRequestHeader("AppKey", "02619EF1A99F54F199590E871ED8B9C2");
			        //xhr.setRequestHeader("AccessToken","9FDBD6E52B54A8ED93DC56D9C3F36420");
			    },
			    success: function(data){
			    	if(data.code==1&&data.msg=='true'){
						//分块存在，跳过    
                        deferred.reject();
					}
			    	if(data.code==1&&data.msg=='false'){
			    		//分块不存在或不完整，重新发送该分块内容 ;  
                        deferred.resolve();
					}
					if(data.code!=1){
						_this.stop(block.file);
						if(params.tipClassName!=null)
							$('#'+block.file.id).find(params.tipClassName).html('处理错误');
                        deferred.reject();
					}
			    },
			    error:function(){
			    	_this.stop(block.file);
					if(params.tipClassName!=null)
						$('#'+block.file.id).find(params.tipClassName).html('处理错误');
			    	deferred.resolve();
			    }
			});
			this.owner.options.formData.fileId=id;
			this.owner.options.formData.chunk=block.chunk
	        return deferred.promise();
		},
		afterSendFile:function(file){
			//页面提示
			if(params.tipClassName!=null)
	            $('#'+file.id ).find(params.tipClassName).html('正在处理...');
			
			if(params.completeUrl==null||params.completeUrl=='')
				return;
			if(_this.params.afterSendFile!=null)
				_this.params.afterSendFile(file);
			
			var id=$('#'+file.id).attr(params.fileIdAttr);
			var postData={
				filemd5:_this.filemap[file.id]
				,filename:file.name
				,baseurl:params.baseUrl
				,fileId:id
			}
			
			//上传完成，提示后台合并
			$.ajax({
			    url: params.completeUrl,
			    type: "POST",
			    async:false,
			    data:postData,
			    dataType: 'JSON',
			    beforeSend: function (xhr) {  
			        //xhr.setRequestHeader("AppKey", "02619EF1A99F54F199590E871ED8B9C2");
			        //xhr.setRequestHeader("AccessToken","9FDBD6E52B54A8ED93DC56D9C3F36420");
			    },
			    success: function(data){
			    	if(params.tipClassName!=null){
						if(data.code==1){
							$('#'+file.id).find(params.tipClassName).html('上传成功');
							if(params.uploadSuccess!=null)
								params.uploadSuccess(file,data);
						}
						else{
							_this.stop(file);
							$('#'+file.id).find(params.tipClassName).html('处理错误');
						}
					}
			    },
			    error:function(data){
			    	_this.stop(file);
					$('#'+file.id).find(params.tipClassName).html('处理错误');
			    }
			});
			
			delete _this.filemap[file.id];	//移除map中的值
		}
	});
	
	//初始化
	this.init=function(){
		this.uploader =WebUploader.create(uploadparams);
		
		//当有文件被添加进队列的时候
		this.uploader.on('fileQueued', function(file) {
			if(params.fileQueued==null)
				return;
			var html=params.fileQueued(file);
			if(html!=null)
				$(params.fileListId).append(html);
			
			//注册事件变化事件
			file.on('statuschange',function(status){
				if(params.statusChange!=null)
					params.statusChange(this.id,status);
				if(params.tipClassName==null)
					return;
				if(status=="queued")
					$('#'+this.id).find(params.tipClassName).html('正在解析');
				if(status=="progress")
					$('#'+this.id).find(params.tipClassName).html('上传中');
				if(status=='interrupt')
					$('#'+this.id).find(params.tipClassName).html('暂停');
				if(status=="complete") return;
					//$('#'+this.id).find(params.tipClassName).html('完成');
				if(status=="cancelled")
					$('#'+this.id).find(params.tipClassName).html('取消');
				if(status=="error"){
					$('#'+this.id).find(params.tipClassName).html('<span style="color:red">上传失败</span>');
				}
			})
		});
		
		//文件上传过程中创建进度条实时显示。
		this.uploader.on('uploadProgress', function(file, percentage) {
			if(params.uploadProgress!=null)
				params.uploadProgress(file, percentage);
		});
		
		//上传失败
		this.uploader.on('uploadError', function(file) {
			if(params.uploadError!=null)
				params.uploadError(file);
		});
		
		//上传结束
		this.uploader.on('uploadComplete',function(file){
			if(params.uploadComplete!=null)
				params.uploadComplete(file);
		})
	}
	
	//获取文件
	this.getFile=function(id){
		return this.uploader.getFile(id);
	}
	//全部暂停
	this.stopAll=function(){
		this.uploader.stop(true);
	}
	//暂停单个文件
	this.stop=function(file){
		this.uploader.stop(file);
	}
	//开始或继续上传
	this.start=function(e){
		this.uploader.upload(e);
	}
	//全部开始
	this.startAll=function(){
		this.uploader.upload();
	}
	//取消上传单个文件
	this.cancel=function(e){
		this.uploader.cancelFile(e);
	}
	//销毁实例
	this.destroy=function(){
		WebUploader.Uploader.unRegister('custom');	//取消注册
		this.uploader.destroy();
	}
}

/**
 * author:caichenghh
 * date:2018/01/19
 * tips：js不存数据，ui即数据，html中data-xx属性存放数据
 */
function FileMgr(params){
	this.bid = params.bId;	//业务id
	this.baseurl = params.baseUrl;	//基路径
	this.fileTag = params.fileTag;	//文件标签
	this.fileType = params.fileType;	//文件类型
	this.fileSize = params.fileSize==null?1024*1024*1024*2:params.fileSize;
	this.cancelcall = params.cancelCall;	//用户点击取消后回调
	this.successcall = params.successCall;	//用户点击成功后回调
	this.onComplete = params.onComplete;	//用户点击确定后回调
	this.onClosed = params.onClosed;	//窗体关闭后回调
	
	var _this = this;
	var _index = null;	//弹出层编号
	var _host = 'http://gateway-dev.591iq.cn'; //host
	//var _host = 'http://localhost:8089/IQGatewayService';
	var _cancelurl = _host + '/apps/support/filemgr/deleteById';	//取消url
	var _inserturl = _host +'/apps/support/filemgr/create';	//插入url
	var _downurl = _host +'/apps/support/filemgr/download';	//下载url
	var _listurl = _host +'/apps/support/filemgr/list';	//获取文件列表url
	var _finishedhtml='';		//完成的html拼接
	
	var uploader = {
	    swf: 'Uploader.swf',    //swf文件路径
	    chunked: true,	//开启分片上传
	    chunkSize:1024*1024*10,	//10M一页
	    threads: 300,	//线程数量
	    chunkRetry:0,//重传次数
	    fileNumLimit:params.fileCount, 	//文件上传数量
	    prepareNextFile: true,	//下一个分片预处理
	    server: _host+'/apps/support/filemgr/upload',   // 文件接收服务端。
	    pick: '#select-file',	//选择文件的按钮id
	    fileSingleSizeLimit:_this.fileSize,	//默认2G
	    resize: false,    // 不压缩image, 默认如果是jpeg，文件上传前会压缩一把再上传
	};
	
	var myparams = {
		fileListId:'#file-list',		//要放入列表Id
		tipClassName:'.tip',	//提示文件状态类名
		fileIdAttr:'data-fileid',	//文件真实id
		blockCheckUrl:_host + '/apps/support/filemgr/blockCheck',		//检查分块是否存在
		completeUrl:_host + '/apps/support/filemgr/complete',			//上传完成后调用合并的Url
		baseUrl:_this.baseurl,
		fileQueued:function(file){
			var html='<tr id="{0}" data-fileid="{3}" data-finished="0" data-url="" class="upload-item">'
				+'<td width="50"><input type="checkbox" /></td>'
	  			+'<td width="500"><div class="item-info">'
	  			+'<div class="filename">{1}</div>'
	  			+'<div class="filesize">{2}</div>'
	  			+'<div class="tip">等待上传</div>'
	  			+'<div class="percent"></div>'
	  			+'</div><div class="layui-progress">'
				+'<div class="layui-progress-bar"></div>'
				+'</div></td><td width="150">'
	  			+'<button class="layui-btn layui-btn-xs btn-upload">上传</button>'
	  			+'<button class="layui-btn layui-btn-warm layui-btn-xs btn-cancel">取消</button>'
	  			+'</td></tr>'
	  			
	  		//计算文件大小
	  		var m=parseInt(file.size/1024/1024);
	  		var kb=parseInt(file.size/1024);
	  		var filesize=kb>0?kb+"KB":file.size+"B";
	  		if(m>0)
	  			filesize=m+"M";
	  		
			html=html.format(file.id,file.name,filesize);
			$('#file-list').append(html);
			
			$('#'+file.id).attr('data-fileid',uuid().toUpperCase().replace(/\-/g,''));
	  		//绑定点击事件
			bindItemEvent(file);
		},
		beforeSendFile:function(file){
			var $file =$('#'+file.id);
			
			var postData={
				id:$file.attr('data-fileid')
				,fileName:file.name
				,fileExt:file.ext
				,fileSize:file.size
				,fileMd5:basefileUploader.filemap[file.id]
				,basePath:_this.baseurl
				,bid:_this.bid
			};
			this.fileTag=params.fileTag;	//文件标签
			this.fileType=params.fileType;	//文件类型
			if(_this.fileTag!=null)
				postData.fileTag=_this.fileTag;
			if(_this.fileType!=null)
				postData.fileType=_this.fileType;
			
			$.ajax({
			    url: _inserturl,
			    async:false,
			    type: "POST",
			    data:postData,
			    dataType: 'JSON',
			    beforeSend: function (xhr) {  
			        //xhr.setRequestHeader("AppKey", "02619EF1A99F54F199590E871ED8B9C2");
			        //xhr.setRequestHeader("AccessToken","9FDBD6E52B54A8ED93DC56D9C3F36420");
			    },
			    success: function(data){
			    	/*
			    	if(data.code!=1){
			    		basefileUploader.stop(file);
			    		//提示
			    		$('#'+file.id).find('.tip').html('上传错误');
			    	} 暂时不处理*/
			    },
			    error:function(){
			    	//basefileUploader.stop(file);
			    	//$('#'+file.id).find('.tip').html('上传错误');暂时不处理
			    }
			});
		},
		uploadProgress:function(file, percentage){	//进度条改变回调
			var $item = $('#'+file.id);
		    var $tip = $item.find('.tip');
		    var $percent=$item.find('.percent');
		    var $progress=$item.find('.layui-progress-bar');
		    
		    $percent.text(parseInt(percentage * 100) + '%');
		    $progress.css('width', parseInt(percentage * 100) + '%');
		},
		uploadError:function(file){	//上传失败回调
			//上传失败
			var $tip=$('#'+file.id).find('.tip');
		    var $btn=$('#'+file.id).find('.btn-upload');
		    
		    $tip.html('<span style="color:red">上传失败</span>');
		    $btn.text('重新上传');
		},
		uploadComplete:function(file){	//上传结束回调 不论成功或者失败
			
		},
		afterSendFile:function(file){	//上传完成（成功不包括验证）
			if(file.getStatus()=="error")	//过滤失败
				return;
			$('#'+file.id).find('.btn-upload').html('已完成');
			$('#'+file.id).find('.btn-upload').addClass('layui-btn-disabled');
			
			//填补字节缺省
			var $item = $('#'+file.id);
			var $percent=$item.find('.percent');
		    var $progress=$item.find('.layui-progress-bar');
			$percent.text('100%');
			$progress.css('width','100%');
		},
		uploadSuccess:function(file,data){	//上传成功回调。包括验证成功
			$('#'+file.id).attr('data-finished',1);
			$('#'+file.id).attr('data-url',data.data);
			if(_this.successcall!=null)
				_this.successcall(file,data);
		},
		statusChange:function(id,status){	//文件状态改变时回调
			var $btn=$('#'+id).find('.btn-upload');
			
			if(status=="queued")
				$btn.text('暂停');
			if(status=="progress")
				$btn.text('暂停');
			if(status=='interrupt')
				$btn.text('继续');
			if(status=="complete"){
				$btn.text('已完成');
			}
			if(status=="error")
				$btn.text('重试');
		}
	}
	var basefileUploader=new BaseUploader(uploader,myparams);	//创建一个baseUpload对象
	
	function uuid() {
	    var s = [];
	    var hexDigits = "0123456789abcdef";
	    for (var i = 0; i < 36; i++) {
	        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
	    }
	    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
	    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
	    s[8] = s[13] = s[18] = s[23] = "-";
	 
	    var uuid = s.join("");
	    return uuid;
	}
	
	//获取文件
	this.getFile=function(params){
		var postData={};
		postData.bId=params.bId;
		if(params.fileType!=null)
			postData.fileType=params.fileType;

		$.ajax({
		    url: _listurl,
		    async:false,
		    type: "POST",
		    data:postData,
		    dataType: 'JSON',
		    beforeSend: function (xhr) {  
		        //xhr.setRequestHeader("AppKey", "02619EF1A99F54F199590E871ED8B9C2");
		        //xhr.setRequestHeader("AccessToken","9FDBD6E52B54A8ED93DC56D9C3F36420");
		    },
		    success: function(data){
		    	if(params.onSuccess!=null)
		    		params.onSuccess(data);
		    }
		});
	}
	
	//加载已完成数据
	this.loadFinished=function(data){
		//data格式fileName,id,fileSize
		var html='';
		for(var i=0;i<data.length;i++){
			var temp='<tr id="{0}" data-fileid="{0}" class="upload-item">'
				+'<td width="50"><input type="checkbox" /></td>'
	  			+'<td width="500"><div class="item-info">'
	  			+'<div class="filename">{1}</div>'
	  			+'<div class="filesize">{2}</div>'
	  			+'<div class="tip">已完成</div>'
	  			+'<div class="percent"></div>'
	  			+'</div></td><td width="150">'
	  			+'<button class="layui-btn layui-btn-xs btn-download">下载</button>'
	  			+'<button class="layui-btn layui-btn-warm layui-btn-xs btn-del">删除</button>'
	  			+'</td></tr>'
	  	
	 		//计算文件大小
	 		if(data[i].fileSize==null)
	 			data[i].fileSize=0;
	  		var m=parseInt(data[i].fileSize/1024/1024);
	  		var kb=parseInt(data[i].fileSize/1024);
	  		var filesize=kb>0?kb+"KB":data[i].fileSize+"B";
	  		if(m>0)
	  			filesize=m+"M";
	  		temp=temp.format(data[i].id,data[i].fileName,filesize);
	  		html+=temp;
		}
		_finishedhtml=html;
	}
	
	//销毁
	this.destroy=function(){
		basefileUploader.destroy();
	}
	
	//展示
	this.show=function(){
		//禁止重复打开
		if($('#select-file').length > 0)
			return;
		var g=parseFloat(_this.fileSize/1024/1024/1024).toFixed(1);
		var m=parseInt(_this.fileSize/1024/1024);
		var k=parseInt(_this.fileSize/1024);
		var size='';
		if(k>0)
			size=k+"KB";
		if(m>0)
			size=m+"M"
		if(g>0)
			size=g+"G";
		if(size=='')
			size=_this.fileSize+"B";
		
		var html='<div class="layui-tab layui-tab-brief filemgr"><ul class="layui-tab-title"><li class="layui-this">待处理</li><li>已完成</li></ul>'
			+'<div class="layui-tab-content">'
			+'<div class="layui-tab-item layui-show">{0}</div>'
  			+'<div class="layui-tab-item">{1}</div>'
  			+'</div></div>';
		var undealwith='<table class="layui-table" lay-skin="line" ><colgroup><col width="50"><col width="500"><col width="150"><col></colgroup><thead><tr><th><input type="checkbox" id="cb-all" /></th><th>文件</th><th>操作</th></tr></thead></table>'
			+'<div class="div-table"><table class="layui-table tablebody" lay-skin="line"><tbody id="file-list"></tbody></table></div>'
			+'<div class="layui-form-mid layui-word-aux"><span class="layui-badge">tips</span> 文件大小不能超过'+size+'</div>'
			+'<div style="display:none"><div id="select-file"></div></div>'
			+'<div class="btn-menus"><button id="btn-yes" class="layui-btn layui-btn-sm layui-btn-normal">确定</button><button id="btn-select" class="layui-btn layui-btn-sm layui-btn-primary">选择文件</button><button id="btn-allupload" class="layui-btn layui-btn-sm layui-btn-primary">全部上传</button><button id="btn-allstop" class="layui-btn layui-btn-sm layui-btn-primary">全部暂停</button><button id="btn-allcancel" class="layui-btn layui-btn-sm layui-btn-primary">全部取消</button></div>';
		var dealwith='<table class="layui-table" lay-skin="line" ><colgroup><col width="50"><col width="500"><col width="150"><col></colgroup><thead><tr><th><input id="cb-delall" type="checkbox" /></th><th>文件</th><th>操作</th></tr></thead></table>'
			+'<div class="div-table"><table class="layui-table tablebody" lay-skin="line" ><tbody id="finished-list"></tbody></table></div>'
			+'<div class="btn-menus"><button id="btn-alldel" class="layui-btn layui-btn-sm layui-btn-primary">全部删除</button></div>'
		html=html.format(undealwith,dealwith);
		
		_index = layer.open({
			title:'<i class="layui-icon">&#xe61d;</i> 文件上传',
			area: ['670px', '480px'],
			content:html,
			type:1,
			shade:0,
			resize:false,
			success:function(){
				//弹出结束后执行初始化
				basefileUploader.init();
				//绑定事件
				bindBaseEvent();
				//加载完成数据
				bindFinishedFile();
			},
			btn:null,
			cancel:function(){
				var cancelids=[];
				$('#file-list').find('tr').each(function(){
					var $tr=$(this);
					//记录未完成文件编号
					cancelids.push($tr.attr('id'));
				});
				if(cancelids.length>0){
					layer.confirm("关闭将丢弃上传文件，是否继续？",function(i){
						//移除未完成文件
						for(var j=0;j<cancelids.length;j++)
							$("#"+cancelids[j]+' .btn-cancel').click();
						
						layer.close(i);
						layer.close(_index);
					});
			    	return false;
				}
			},
			end:function(){
				if(_this.onClosed!=null)
					_this.onClosed();
			}
		});
	}
	
	//绑定完成文件
	function bindFinishedFile(){
		$('#finished-list').html(_finishedhtml);
		
		//全选事件
		$('#cb-delall').click(function(){
			var obj=this;
			$('#finished-list').find('input[type=checkbox]').each(function(){
				if($(obj).is(':checked'))
					$(this)[0].checked=true;
				else
					$(this)[0].checked=false;
			})
		});
		
		//全部删除
		$('#btn-alldel').click(function(){
			$('#finished-list').find('input[type=checkbox]').each(function(){
				if($(this).is(':checked')){
					var $tr=$(this).parent().parent();
					//$tr.find('.btn-del').click();
					//通知服务端删除
		  			$.ajax({
					    url: _cancelurl,
					    async:true,
					    type: "POST",
					    data:{fileId:$tr.attr('id')},
					    dataType: 'JSON',
					    beforeSend: function (xhr) {  
					        //xhr.setRequestHeader("AppKey", "02619EF1A99F54F199590E871ED8B9C2");
					        //xhr.setRequestHeader("AccessToken","9FDBD6E52B54A8ED93DC56D9C3F36420");
					    },
					    success: function(data){
					    	//不做处理
					    }
					});
					$tr.remove();
				}
			});
		});
		
		//绑定按钮事件
		$('#finished-list tr').each(function(){
			var $tr=$(this);
			//下载
			$tr.find('.btn-download').click(function(){
				var url=_downurl;
				var param={fileId:$tr.attr('id')};
				var $iframe = $('<iframe id="downloadIframe" src="' + url + '"></iframe>');
		        var $form = $('<form target="downloadIframe" method="post"></form>');
		        $form.attr('action', url);
		        for (var key in param) {
		            $form.append('<input type="hidden" name="' + key + '" value="' + param[key] + '"/>')
		        }
		        $('body').append($iframe);
		        $iframe.append($form);
		        $form[0].submit();
		        $iframe.remove();
			})
			//删除
			$tr.find('.btn-del').click(function(){
				layer.confirm("是否确定删除该文件？",function(i){
					//通知服务端删除
		  			$.ajax({
					    url: _cancelurl,
					    async:true,
					    type: "POST",
					    data:{fileId:$tr.attr('id')},
					    dataType: 'JSON',
					    beforeSend: function (xhr) {  
					        //xhr.setRequestHeader("AppKey", "02619EF1A99F54F199590E871ED8B9C2");
					        //xhr.setRequestHeader("AccessToken","9FDBD6E52B54A8ED93DC56D9C3F36420");
					    },
					    success: function(data){
					    	//不做处理
					    }
					});
					$tr.remove();
					layer.close(i);
				});
			})
		})
	}
	
	//绑定每项事件
	function bindItemEvent(file){
		//上传点击事件
		$("#"+file.id+' .btn-upload').click(function(){	
  			var id=file.id;
  			var status=file.getStatus();
  			var txt=$(this).text();
  			if(txt=='已完成'){
  				return;
  			}
  			
  			if(status=='inited')
  				basefileUploader.start(id);
  			if(status=='error')
  				basefileUploader.start(file);
  			if(status=='interrupt')
  				basefileUploader.start(file);
  			if(status=='queued'||status=='progress')
  				basefileUploader.stop(file);
  		});
		
		//取消点击事件
  		$("#"+file.id+' .btn-cancel').click(function(){	
  			var id=file.id;
  			basefileUploader.cancel(id);
  		
  			//通知服务端删除
  			$.ajax({
			    url: _cancelurl,
			    async:false,
			    type: "POST",
			    data:{fileId:$('#'+id).attr('data-fileid')},
			    dataType: 'JSON',
			    beforeSend: function (xhr) {  
			        //xhr.setRequestHeader("AppKey", "02619EF1A99F54F199590E871ED8B9C2");
			        //xhr.setRequestHeader("AccessToken","9FDBD6E52B54A8ED93DC56D9C3F36420");
			    },
			    success: function(data){
			    	//不做处理
			    }
			});
  			
  			var url = $('#'+file.id).attr('data-url');
  			if(_this.cancelcall!=null)
  				_this.cancelcall(file,url);
  			
  			$('#'+id).remove();//ui上移除
  		})
	}
	
	//绑定基础事件
	function bindBaseEvent(){
		//全选事件
		$('#cb-all').click(function(){
			var obj=this;
			$('#file-list').find('input[type=checkbox]').each(function(){
				if($(obj).is(':checked'))
					$(this)[0].checked=true;
				else
					$(this)[0].checked=false;
			})
		});
		//确定
		$('#btn-yes').click(function(){
			var urls=[];
			$('#file-list').find('tr').each(function(){
				var $tr=$(this);
				//保存完成的记录
				if($tr.attr('data-finished')=='1'){
					urls.push($tr.attr('url'));
				}
			});
			if(urls.length<1){
				layer.msg('当前无需要处理的文件');
				return;
			}
				
			layer.confirm("将保存上传文件，未完成的文件将被移除，是否继续？",function(i){
				//移除未完成文件
				$('#file-list').find('tr').each(function(){
					var $tr=$(this);
					if($tr.attr('data-finished')=='0'){
						$tr.find('.btn-cancel').click();
					}
				});
				
				//调用回调用
				if(_this.onComplete!=null){
					_this.onComplete();
				}
				
				layer.close(i);
				layer.close(_index);
			});
		});
		//选择文件
		$('#btn-select').click(function(){
			$('#select-file input').click();	//转点选择文件
		});
		//全部上传
		$('#btn-allupload').click(function(){
			var i=0;
			$('#file-list').find('input[type=checkbox]').each(function(){
				if($(this).is(':checked')){
					var $tr=$(this).parent().parent();
					//只有未完成的可以开始
					if($tr.attr('data-finished')=='0'){
						i++;
						basefileUploader.start($tr.attr('id'));
					}
				}
			});
			if(i==0)
				layer.msg('当前无需要上传的文件');
		});
		//全部暂停
		$('#btn-allstop').click(function(){
			$('#file-list').find('input[type=checkbox]').each(function(){
				if($(this).is(':checked')){
					var $tr=$(this).parent().parent();
					//只有未完成的可以暂停
					if($tr.attr('data-finished')=='0')
						basefileUploader.stop($tr.attr('id'));
				}
			});
		});
		//全部取消
		$('#btn-allcancel').click(function(){
			$('#file-list').find('input[type=checkbox]').each(function(){
				if($(this).is(':checked')){
					var $tr=$(this).parent().parent();
					$tr.find('.btn-cancel').click();
				}
			});
		});
	}
}