package demo.utilites;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class FileHelper {
	
	/**
	 * 合并文件
	 * @param source
	 * @param filepath
	 * @throws Exception
	 */
	public static void combineFile(String source,String filepath) throws Exception  {  
		File[] files =new File(source).listFiles();
		if(files==null||files.length<1)
			return;
		
		try(OutputStream outstream=new FileOutputStream(filepath)){
			//依次写入
			for(File item :files){
				try(InputStream instream=new FileInputStream(item)){
					byte[] buffer = new byte[1024*1024*1];	//缓冲区文件大小为1M  
	                int len = 0;  
	                while((len = instream.read(buffer,0,1024*1024*1)) != -1){  
	                	outstream.write(buffer,0,len);  
	                }
				}
			}
		}
    }
}
