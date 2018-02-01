package demo.controllers;

import java.io.File;
import java.util.Iterator;

import javax.servlet.http.HttpServletRequest;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import demo.utilites.FileHelper;


@Controller
public class FileDemoController {
	class ResultData{
		private int code=0;
		
		public ResultData(int code) {
			this.code=code;
		}
		
		public int getCode() {
			return code;
		}
		public void setCode(int code) {
			this.code = code;
		}
	}
	
	@ResponseBody
	@RequestMapping("Upload2")
	public String upload(HttpServletRequest request,String filemd5,String chunk){		
		try{
			MultipartHttpServletRequest mRequest=(MultipartHttpServletRequest)request;
			Iterator<String> names = mRequest.getFileNames();
			String path=getWebRoot()+"build/inplaceWebapp/UploadFiles/"+filemd5+"/";
			//System.out.println("upload:"+path);
			while(names.hasNext()){
				String name=names.next();
				MultipartFile file = mRequest.getFile(name);
				
				new File(path).mkdirs();
				file.transferTo(new File(path+chunk));
			}
		}catch(Exception e){
			System.out.println(e);
		}
		return "";
	}
	
	@ResponseBody
	@RequestMapping("BlockCheck2")
	public ResultData blockCheck(String filemd5,String chunk,long chunkSize){
		String path=getWebRoot()+"/build/inplaceWebapp/UploadFiles/"+filemd5+"/"+chunk;
		//System.out.println("check:"+path);
		File file=new File(path);
		if(file==null||!file.exists()||file.length()!=chunkSize)
			return new ResultData(0);
		return new ResultData(1);
	}
	
	@ResponseBody
	@RequestMapping("CompleteUpload2")
	public ResultData completeUpload(String filemd5,String filename,String baseurl){
		String path=getWebRoot()+"/build/inplaceWebapp/UploadFiles/";
		
		try{
			FileHelper.combineFile(path+filemd5+"/", path+filename);
			deleteDir(new File(path+filemd5+"/"));
			return new ResultData(1);
		}catch(Exception e){
			System.out.println(e);
			return new ResultData(0);
		}
		
	}
	
	@ResponseBody
	@RequestMapping("CancelUpload2")
	public void cancelUpload(String md5){
		String path=getWebRoot()+"/build/inplaceWebapp/UploadFiles/"+md5+"/";
		deleteDir(new File(path));
	}
	
	private boolean deleteDir(File dir) {
		if (dir.isDirectory()) {
			String[] children = dir.list();
			//递归删除目录中的子目录下
			for (int i=0; i<children.length; i++) {
				boolean success = deleteDir(new File(dir, children[i]));
				if (!success) {
					return false;
				}
			}
		}
		// 目录此时为空，可以删除
		return dir.delete();
	}
	
	/**
	 * 获取当前Web根目录物理路径
	 * @return
	 */
	public String getWebRoot(){
		String url = FileDemoController.class.getResource("").getPath();  
        String path = url.substring(0, url.indexOf("UploadDemo"));
        return path+"UploadDemo/";
	}
}
