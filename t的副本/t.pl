#!/usr/bin/perl
################################################################################
#
# wanght 
################################################################################

################################################################################
# use
################################################################################
use strict;
use warnings;
   
use FindBin qw($RealBin);
use lib "$RealBin";


#use Net::SFTP::Foreign;
use File::Copy;

use Cwd;  
use public; 
  

 
################################################################################
# start
################################################################################
my %config;

################################################################################
# %last_synclib = {name=>$name, content=>\@file_list}; 
# %libinfo = {$name=>$root}; 
my %synclib; 
my %rlibinfo; 
my %libinfo; 


################################################################################
#%lib = {name=>$name,rootpath=>$rootpath, content=>\%filetree};
#%filetree = {$path=>\@file_list};

################################################################################
#	push @put_que, {name=>$lib, nodetyp=>"LIB", content=>\%filetree};
#	push @put_que, {name=>$str, nodetyp=>"FOLDER", ftree=>\%filetree,  lib=>$lib}; 
#	push @put_que, {name=>$str, nodetyp=>"FILE",  lib=>$lib}; 
#	
#	push @get_que, {name=>$lib, nodetyp=>"LIB", content=>\%filetree};
#	push @get_que, {name=>$str, nodetyp=>"FOLDER", ftree=>\%filetree,  lib=>$lib}; 
#	push @get_que, {name=>$str, nodetyp=>"FILE",  lib=>$lib};   
#	
#	push @del_local_que, {name=>$lib, nodetyp=>"LIB", root=>$lpath};
#	push @del_local_que, {name=>$str, nodetyp=>"FOLDER",  lib=>$lib};  
#	push @del_local_que, {name=>$str, nodetyp=>"FILE",  lib=>$lib}; 
#	
#	push @del_remote_que, {name=>$lib, nodetyp=>"LIB", root=>$rpath};				
#	push @del_remote_que, {name=>$str, nodetyp=>"FOLDER",  lib=>$lib};  
#	push @del_remote_que, {name=>$str, nodetyp=>"FILE",  lib=>$lib};  
################################################################################

my @put_que;
my @get_que;
my @del_remote_que;
my @del_local_que;

&main();
exit 0;

################################################################################
# end
################################################################################
################################################################################
# function
################################################################################
sub main {
    begin(__FILE__);
    if ( not defined $ARGV[0] ) {
        print "tansformer.pl sync_date\n";
    } 
     
	undef %config;
	undef %libinfo;
	undef %synclib;
    parseConfigFile( $RealBin."/config/config.conf", \%config );
    
    parseConfigFile( $RealBin."/config/libconfig.conf", \%libinfo );
    parseSyncRec( $RealBin."/config/last_sync", \%synclib );
    
#	viewSyncRec();
    
	getRemoteLibs();
	
#	viewLibinfo(\%libinfo);
#	viewLibinfo(\%rlibinfo);	
#	viewlibsDetails();
	
	transform();    
	sync();
	
#	viewLibinfo(\%libinfo);
#	viewLibinfo(\%rlibinfo);
	recConfig();	
	recSync($RealBin."/config/last_sync");

    end(__FILE__);
}

################################################################################
# function getRemoteLibs
#
################################################################################
sub getRemoteLibs { 
	############################################################################
	#getRemoteLibs	
    my $file = "rlibconfig.conf"; 
    my $rt   = getRemotFile($config{remote_conf}."/".$file);   
	
	undef %rlibinfo;
	if (-e $file){  
		parseConfigFile($RealBin."/$file", \%rlibinfo);		
    	move($RealBin."/$file", $RealBin."/config/$file"); 
	}
}


################################################################################
# function viewlibsDetails
#
################################################################################
sub viewlibsDetails { 


    ############################################################################
    #view all the libs 
    my $libt   = 1;
    my $ftree  = 1;
    my $patht  = 1;
    
    print '-' x 70 . "\n";
	print "locally:\n";
    foreach $libt (sort keys %libinfo){  
    	
			$patht  = $libinfo{$libt};	
		    print '=' x 60 . "\n";
		    print "lib:".$libt."\t";
		    print "path:".$patht."\n"; 
		    $ftree  = lsLocalLib($patht); 
			viewFileHash($ftree, 0);	
	}
    print '-' x 70 . "\n";
	print "remotely:\n";
	foreach $libt (sort keys %rlibinfo){
			$patht  = $rlibinfo{$libt}; 
		
		    print '=' x 60 . "\n";
		    print "lib:".$libt."\t";
		    print "path:".$patht."\n"; 
		    $ftree  = lsRemoteLib($patht); 
			viewFileHash($ftree, 0);
	}     
    
	
}


################################################################################
# function transform
#
################################################################################
sub transform { 
	
#    print '-' x 80 . "\n";
#	print "in transform...\n";    
    
    ############################################################################
#    print '+' x 80 . "\n";
#	print "in transform...libs in local, include  'A-B','A&&B'\n";    
    #libs in local, include "A-B","A&&B"
    
    my $lib   = 1;
    my $lpath = 1;
    my $rpath = 1;
    foreach $lib (keys %libinfo){ 
	  
		$lpath = $libinfo{$lib};		
	    ########################################################################
		if (!exists $rlibinfo{$lib}){		
			#put current local lib's file into putque
			#....	
			#print "in transform...local is more \n"; 
			if (!exists $synclib{$lib}){
				#this lib is not in the last sync lib list
				#local new added lib,will be put to remote	
				
		    	my $ftree = lsLocalLib($lpath);
				push @put_que, {name=>$lib, nodetyp=>"LIB", content=>\%$ftree};
				
			}else{
				# this lib is in the last sync lib list, but remote have not mean
				# that remote del this lib
				# local lib,will be delete
				
				#del_folder($lpath);
				push @del_local_que, {name=>$lib, nodetyp=>"LIB", root=>$lpath};
			}
		}else{
		 
		    ####################################################################
			#print "in transform... same lib comp the files \n"; 
	
			$rpath  = $rlibinfo{$lib};
			my $rftree  = lsRemoteLib($rpath);
		    my $lftree  = lsLocalLib($lpath);  	
			
		    compPathes($rftree, $lftree, $lib);
		}
    }
    
    ############################################################################
#    print '+' x 80 . "\n";
#	print "in transform...libs in romote, but not in locally\n";  
    #libs in romote, but not in local
    foreach $lib (keys %rlibinfo){
    	 
		if (!exists $libinfo{$lib}){
			#put current remote lib's file into getque
			#....
			$rpath = $rlibinfo{$lib};	    	
			if (!exists $synclib{$lib}){
				# exist in remote, not in sync rec, it's new added,
				# get it from remote
		    	my $ftree = lsRemoteLib($rpath);
				push @get_que, {name=>$lib, nodetyp=>"LIB", content=>\%$ftree};
				
			}else{
				# folder exist in remote, and in sync rec, it's delete by local
				# delete it in remotely
				push @del_remote_que, {name=>$lib, nodetyp=>"LIB", root=>$rpath};
			} 
	    	
		}
    }
    
	0;
}



################################################################################
# function lsRemoteLib
#
################################################################################
sub lsRemoteLib{  	
    my $rootpath     = shift;
    
    my %filetree;
    undef %filetree;
    lsRemote($rootpath, ".", \%filetree);
    return \%filetree;
}

################################################################################
# function lsRemote
#
################################################################################
sub lsRemote { 
    my $path	  = shift; 
    my $pathkey	  = shift; 
    my $ftree	  = shift; 
 
#print "\n"; 
#print '-' x 80 . "\n";
#print "in lsRemote...\n"; 
    ############################################################################
    #get last folder nm
    my $folder    = substr($path, rindex($path, "/"));
    my $lsf       = $folder.".".timestamp().".r"; 

#生成SH脚本         
    my $text   = "ls ".$path;  
    my $shname = $RealBin . "/ls.b";
    open( my $fp, ">$shname" ) or die "Can't open $shname: $!";
    print {$fp} $text;
    close $fp;
    
    #ls remote path
    $text =  psftp($shname);
    
    #write file list into lsf
    open( $fp, ">$lsf" ) or die "Can't open $lsf: $!";
    print {$fp} $text;
    close $fp;      
    
    ############################################################################
    my @lf=();
    undef @lf;
    open FILE, $lsf;
    foreach (<FILE>) {
        next if (/^#/);    #注释行
        s/[\r\n]//g;       #去除回车换行符
        s/\s+$//g;         #去除行尾白字符
        s/^\s+//g;         #去除行首白字符 
        
        my $row = $_;
        
        my $i = 0;
        my $attr = "";
        my $fnm  = ""; 
        while (/\s+/g){
        	if ($i==0){
        		$attr = substr($row, 0, pos());
        	}elsif ($i==7){
				$fnm  = substr($row, pos());
        	}
        	$i++;
        }        
        
        next if (($fnm eq ".")||($fnm eq ".."));
        next if ($i <7);	#忽略汇总行               
        if  (substr($attr,0,1) eq "d"){
        	next if ($fnm eq "dirinfo");
        	lsRemote($path."/".$fnm, $pathkey."/".$fnm, $ftree);
        	
        }else{
        	push @lf, $fnm;
        }
    }
    close FILE;
    
    ############################################################################
    
    move($lsf, $config{dirinfo});      
    $$ftree{$pathkey} = \@lf ;
}


################################################################################
# function lsLocalLib
#
################################################################################
sub lsLocalLib{ 
	my $rootpath     = shift; 
	    
    my %filetree ;
    undef %filetree ;
    lsLocal($rootpath, ".", \%filetree);
    return \%filetree;
}

################################################################################
# function lsLocal
# res:hash, {folder}=>filelist; folder is relative path
################################################################################
sub lsLocal{ 
    my $path      = shift;
    my $pathkey	  = shift; 
    my $ftree	  = shift; 
     
	#print "\n"; 
	#print '-' x 80 . "\n";
	
    ############################################################################
    my $folder    = substr($path, rindex($path, "\\"));                           
    my $lsf       = sprintf("%s\%s.%s.l", $config{dirinfo}, $folder, timestamp());	
	my $cmd		  = sprintf("dir /b %s >%s", $path, $lsf);
#	print "cmd:\t\t".$cmd ."\n"; 

	scriptLog($cmd);
    `$cmd`; 
    
    ############################################################################
    my @lf=();
    undef @lf;
#push @lf, "";
    
    open FILE, $lsf;
    foreach (<FILE>) {
        s/[\r\n]//g;       #去除回车换行符
        s/\s+$//g;         #去除行尾白字符
        s/^\s+//g;         #去除行首白字符 
        
        next if (($_ eq ".")||($_ eq ".."));
    	my $fnm = $_;    
    	
        if  ( -d $path."\\" .$fnm){   
        	next if ($fnm eq "dirinfo"); 
        	   	
        	lsLocal($path."\\".$fnm, $pathkey."/".$fnm, $ftree);
        }else{       	
        	push @lf, $fnm;
    	} 
    }    
    $$ftree{$pathkey} = \@lf ;
    
    close FILE;	
}


################################################################################
# function viewFileHash
#
################################################################################
sub viewFileHash { 
	my $h_hash  = shift;
	my $tabs    = shift;
	
	foreach my $spath (sort keys %$h_hash){	
    	print "\t" x (1+$tabs);
    	print '=' x 40 . "\n";
    	
    	print "\t" x (1+$tabs);
		print "path:\t".$spath."\n";

		foreach my $str (@{$$h_hash{$spath}}){	
    		print "\t" x (2+$tabs);	
			print "file:\t\t".$str."\n";  
		}
	}
}



################################################################################
# function compPathes
#
################################################################################
sub compPathes { 
	my $rflist    = shift;
	my $lflist    = shift;
	my $lib       = shift;
	    
	my $str = 1; 
	my $tabs = 1;
#    print "\t" x ($tabs);
#    print '+' x 60 . "\n";
#    print "\t" x ($tabs);
#	print "in compPathes ... lib:\t".$lib."\n";
	my %seen=();
	my @folders 		= keys %$lflist;
	my @objfolders		= keys %$rflist;

	foreach (@folders){
		$seen{$_}=1;
	}
	my @intersection=grep($seen{$_}, @objfolders);
	my @difference1=grep(!$seen{$_}, @objfolders);	
	
	undef %seen;
	foreach (@objfolders){
		$seen{$_}=1;
	}
	my @difference2=grep(!$seen{$_}, @folders);	
	
	############################################################################
	my %filetree = ();
	foreach $str (@intersection){
		 
#    	print "\t" x ($tabs+1);
#		print "same path:\t".$str."\n";
		
		compFiles($$lflist{$str}, $$rflist{$str}, $lib, $str);		
	}
	
	############################################################################
	foreach $str (@difference2){ 
		# folder not exist in remote, in local
		if (!findSyncFolder($lib, $str)){
			# folder not exist in remote,not in sync rec, it's new added,
			# put it to remote
			undef %filetree;
			getFileTree($str, $lflist, \%filetree);
			push @put_que, {name=>$str, nodetyp=>"FOLDER", lib=>$lib, ftree=>\%filetree}; 
			
		}else{
			# folder not exist in remote,  in sync rec, it's delete by remote
			# delete it local
			push @del_local_que, {name=>$str, nodetyp=>"FOLDER", lib=>$lib}; 
		} 
#    	print "\t" x ($tabs+1);
#		print "diff FOLDER local:\t".$str."\n";
	}
	
	############################################################################
	foreach $str (@difference1){
		# folder exist in remote, not in local
		if (!findSyncFolder($lib, $str)){
			# folder exist in remote,not in sync rec, it's new added,
			# get it from remote
			undef %filetree;
			getFileTree($str, $rflist, \%filetree);
			push @get_que, {name=>$str, nodetyp=>"FOLDER", lib=>$lib, ftree=>\%filetree};  
			
		}else{
			# folder exist in remote, and in sync rec, it's delete by local
			# delete it in remotely
			push @del_remote_que, {name=>$str, nodetyp=>"FOLDER", lib=>$lib}; 
		} 
#    	print "\t" x ($tabs+1);
#		print "diff FOLDER remotely :\t".$str."\n";
	}
}



################################################################################
# function findSyncFolder
#
################################################################################
sub findSyncFolder { 
	my $lib        = shift;
	my $folder     = shift;
	
#	print  "\n";
#	print  "in findSyncFolder ... \n";
#	print  " lib:$lib|folder:$folder \n";
		
	my %f;
	undef %f;
	
	my $item = 1;	
	foreach $item (@{$synclib{$lib}}){
		
    	my $ts = substr($item, 0, rindex($item, "/"));
    	if (!exists $f{$ts}){
#    			print "$ts\n";
    			$f{$ts} =1;
    	}
	}
#	print  "findSyncFolder over... \n";
    return (exists $f{$folder});
}


################################################################################
# function getFileTree
#
################################################################################
sub getFileTree { 
	my $folder =  shift;
	my $flist  =  shift;
	my $ftree  =  shift;
	
	
	my %seen=();
	my @folders 		= keys %$flist;	
	foreach (@folders){
		$seen{$_}=1;
	}
	my @intersection=grep($seen{$_}, $folder); 
	
	foreach my $item (@intersection){ 
		$$ftree{$item} = $$flist{$item};
	}
	
}

################################################################################
# function compFiles
#
################################################################################
sub compFiles { 
	   
	my $items			= shift; 
	my $objitems		= shift; 
	my $lib     		= shift; 
	my $path    		= shift; 
	    
#	print "\n";
	
	my $tabs = 3;
#    print "\t" x ($tabs);
#    print '+' x 40 ."\n";
#    print "\t" x ($tabs); 
#	print "in compFiles ... \n";
	
	my %seen=(); 
	foreach (@$items){
		$seen{$_}=1;
	}
	my @intersection=grep($seen{$_}, @$objitems);
	my @difference1=grep(!$seen{$_}, @$objitems);	
	
	undef %seen;
	foreach (@$objitems){
		$seen{$_}=1;
	}
	my @difference2=grep(!$seen{$_}, @$items);	
	
	############################################################################	
	my $str = 1; 
#    print "\t" x ($tabs);
#	print "same file:\n";
	foreach $str (@intersection){
		
#    	print "\t" x ($tabs+1);
#		print $str."\n";
		########################################################################
		#find out the newest file
		
	}
#	print "\t" x ($tabs);
#	print "diff file2:\n";
	foreach $str (@difference2){	
		my $ffile = $path."/".$str;
#		print "file is :$str\n";
		if (!findSyncFile($str, $lib, $path)){
			#  not exist in remote,  not in sync rec, it's new added,
			# put it to remote
			push @put_que, {name=>$ffile, nodetyp=>"FILE",  lib=>$lib}; 
			
		}else{
			#  not exist in remote,  in sync rec, it's delete by remote
			# delete it local
			push @del_local_que, {name=>$ffile, nodetyp=>"FILE",  lib=>$lib}; 
		} 
#    	print "\t" x ($tabs+1);
#		print "local: $str\n";
	}
	
#    print "\t" x ($tabs);
#	print "diff file1:\n";
	foreach $str (@difference1){
		my $ffile = $path."/".$str;
		#  exist in remote, not in local
		if (!findSyncFile($str, $lib, $path)){
			#  exist in remote,  not in sync rec, it's new added,
			# get it from remote
			push @get_que, {name=>$ffile, nodetyp=>"FILE",  lib=>$lib}; 
			
		}else{
			#  exist in remote, and in sync rec, it's delete by local
			# delete it in remotely
			push @del_remote_que, {name=>$ffile, nodetyp=>"FILE",  lib=>$lib}; 
		} 		
		
#    	print "\t" x ($tabs+1);
#		print "remote:$str\n";
	}
}



################################################################################
# function findSyncFile
#
################################################################################
sub findSyncFile { 
	
	my $file			= shift; 
	my $lib     		= shift; 
	my $path    		= shift; 
	
#	print  "\n";
#	print  "in findSyncFile ... \n";
#	print  " file:$file|lib:$lib|path:$path \n";
	
	my %f;
	undef %f;
	
	my $item = 1;
	foreach $item (@{$synclib{$lib}}){
		my $fpath = substr($item, 0, rindex($item, "/")); 
		my $fnm   = substr($item, rindex($item, "/")+1); 
		next if (!$fpath eq $path);
		
		$f{$fnm} = 1; 
	}
    return (exists $f{$file});    
	
}




################################################################################
# function getRemotFile
#
################################################################################
sub getRemotFile { 
    my $file = shift;   
	
#生成SH脚本         
    my $text   = "get $file";  
#print $text."\n";   
 
    my $shname = $RealBin . "/get.b";
    open( my $fp, ">$shname" ) or die "Can't open $shname: $!";
    print {$fp} $text."\n";
    close $fp;
        
	scriptLog($text);
    psftp($shname);

}



################################################################################
# function getRemotFile
#
################################################################################
sub putRemotFile { 
    my $file = shift;   
	
#生成SH脚本         
    my $text   = "put $file";  
#print $text."\n";   
 
    my $shname = $RealBin . "/put.b";
    open( my $fp, ">$shname" ) or die "Can't open $shname: $!";
    print {$fp} $text."\n";
    close $fp;
        
	scriptLog($text);
    psftp($shname);

}




################################################################################
# function psftpCmd
#
################################################################################
sub psftpCmd { 
    my $text = shift;    
    my $shname = shift;    
 
    #my $shname = $RealBin . "/cmd.b";
    open( my $fp, ">$shname" ) or die "Can't open $shname: $!";
    print {$fp} $text."\n";
    close $fp;
        
	scriptLog($text);
	
    psftp($shname);

}


################################################################################
# function psftp
#
################################################################################
sub psftp { 
    my $shname = shift;
    
    my $cmd = sprintf("psftp -pw %s %s@%s -be -b %s", $config{pwd}, $config{user}, $config{host}, $shname);  
        
	scriptLog($cmd);
    `$cmd`;     
}

################################################################################
# function viewLibinfo
#
################################################################################
sub viewLibinfo{
	
	print "\n";	
    print "#" x 80;	
	print "\n in viewLibinfo ...\n";	
	
    my $hash = shift; 
    foreach my $h (sort keys %$hash){
    	print "\t".$h."\t".$$hash{$h}."\n";
    }
}


################################################################################
# function viewFile
#
################################################################################
sub viewFile { 
    my $file = shift;
    
    open FILE, $file;
    foreach (<FILE>) {
        next if (/^#/);    #注释行
        s/[\r\n]//g;       #去除回车换行符
        s/\s+$//g;         #去除行尾白字符
        s/^\s+//g;         #去除行首白字符 
        print $_."\n";
    }
    close FILE;
}

################################################################################
# function timestamp
#
################################################################################
sub timestamp { 
	my ($sec,$min,$hour,$day,$mon,$year,$wday,$yday,$isdst) = localtime(); 

    return sprintf("%d%d%d%d%d", $year, $mon, $day, $min, $sec);
}


################################################################################
# function viewSyncRec
#
################################################################################
sub viewSyncRec{
	
	print "\n";	
    print "#" x 80;	
	print "\n in viewSyncRec ...\n";	
	
	my %f;
	undef %f;
		
    foreach my $h (sort keys %synclib){
    	print "\t[$h]\n";
    	
    	my $hash = $synclib{$h};
    	foreach my $ss (@{$hash}){ 
    		my $tt = substr($ss, 2);
        	if ($tt =~ /\//){
        		my $ts = substr($tt, 0, rindex($tt, "/"));
        		if (!exists $f{$ts}){
    				print $ts."\t";
    				$f{$ts} =1;
    			}
    		}
    		print "\t\t item:$ss\n"; 
    	}
    }
    
}

################################################################################
# function parseSyncRec
#
################################################################################
sub parseSyncRec { 

    my $file   = shift;
    my $r_hash = shift;
  	
	undef %$r_hash;    #清空变量
  	return if (! -e $file);
		    
    my $libname = 1;
    my $lf   = 1;
    open FILE, $file;
    foreach (<FILE>) {
        next if (/^#/);    #注释行
        next if (/^\s*$/); #空白行   
        
        s/[\r\n]//g;       #去除回车换行符
        s/\s+$//g;         #去除行尾白字符
        s/^\s+//g;         #去除行首白字符
        
        my $line = $_;
        if ($line =~ /^last_libs\:.*$/){
        	$libname    = substr($line, rindex($line, ":")+1); 
        	
#        	print "\tlibname:".$libname."\n";
        	
    		my @flist = {};
    		$lf = \@flist;
        	
        }elsif($line =~ /^end_lib$/){      
		    $$r_hash{$libname} = $lf;
        	
    	}else{
    		push @{$lf}, $line;
    	}
    }
    close FILE;
}



################################################################################
# function sync
#
################################################################################
sub sync {  
	
	print "\n";	
    print "#" x 80;	
	print "\n in sync ...\n";	
		
#	viewSync();	
	syncInstance(); 

}
 
################################################################################
# function viewSync
#
################################################################################
sub viewSync {  
	
	print "\n";	
	syncItem (\@put_que, "put_que");
	syncItem (\@get_que, "get_que");
	syncItem (\@del_local_que, "del_local_que");
	syncItem (\@del_remote_que, "del_remote_que"); 
}
 
 
 
################################################################################
# function syncInstance
#
################################################################################
sub syncInstance { 
 
	print "\n";	
	print '#' x 80 . "\n";	
	print "in syncInstance ...\n"; 	
	
	my $script = "FtpScript";
	`del $script` if (-e $script);
	
 	my %queproc;
 	$queproc{"put_que"} 		= \&syncPutQue;
 	$queproc{"get_que"} 		= \&syncGetQue;
 	$queproc{"del_local_que"} 	= \&syncDelLoc ;
 	$queproc{"del_remote_que"}	= \&syncDelRemote ;
 	
 	my @ques = qw(put_que get_que del_local_que del_remote_que);
 	foreach my $que_idx (@ques){
 		$queproc{$que_idx}($script);
 	}
 	
 	psftp($script);
 	
}


 
################################################################################
# function recFtpScript
#
################################################################################
sub recFtpScript { 
 
    my $file = shift;
    my $text = shift;    
	
	open( my $fp, ">>$file" ) or die "Can't open $file: $!";    
    print {$fp} "\n$text\n"; 
    close $fp;   

}


################################################################################
# function ftpFileHash
#
################################################################################
sub ftpFileHash { 
	my $libs      = shift;
	my $h_hash    = shift;
	my $proc      = shift;
	
	print "\n";	
	print "\t in ftpFileHash ...\n"; 	 
	
	############################################################################
	# lroot and rroot is lib itself root in both host
	#
	my $lroot = 1;
	if (exists $libinfo{$libs}){
		$lroot  = $libinfo{$libs}; 
	}else {
		$lroot  = $config{datpath}."\\".substr($rlibinfo{$libs}, rindex($rlibinfo{$libs}, "/")+1); 
	}
	my $rroot = 1;
	if (exists $rlibinfo{$libs}){
		$rroot  = $rlibinfo{$libs}; 
	}else {
		$rroot  = $config{remote_dat}."/".substr($libinfo{$libs}, rindex($libinfo{$libs}, "\\")+1); 
	}
	
	
	############################################################################
	my $text = "";
	foreach my $path (sort keys %$h_hash){	
#		print "path:".substr($path,1)."\n";
#		print "rroot:".$rroot.substr($path,1)."\n";
#		print "lroot:".$lroot.substr($path,1)."\n";
		my $tpath = substr($path,1);
		$tpath =~ s/\//\\/g; 
		if ($proc eq "put"){
			$text = $text . "\t\tmv $path ./deled".substr($path,1) ." \n";
			$text = $text . "\t\tmkdir ". $rroot.substr($path,1) ." \n";	 
    		
		}elsif ($proc eq "get"){
			
			mkdir $lroot.$tpath;		
		}
		
		
		my $cmdstrH = sprintf("\t\tlcd %s%s \n\t\tcd %s%s \n", $lroot, $tpath, $rroot, substr($path,1)); 
		
		my $cmdstr = "";
		foreach my $str (@{$$h_hash{$path}}){	
			$cmdstr = $cmdstr.$proc. " \"" . $str."\"\n";
		}
		
		$text = $text . $cmdstrH. $cmdstr;
	}
	############################################################################
#	psftpCmd($text, "ftpFileHash".$proc); 
#print "$text\n";
	return $text;
}


################################################################################
# function ftpLibFile
#
################################################################################
sub ftpLibFile { 
	my $libs     = shift;
    my $file 	 = shift;  
    my $proc 	 = shift;    
	  
	my $fpath = substr($file, 0, rindex($file, "/")); 	
	my $lpath = $libinfo{$libs}.substr($fpath,1); 
	my $rpath = $rlibinfo{$libs}.substr($fpath,1); 
	
	$lpath =~ s/\//\\/g;
	
    my $text   = "
    lcd $lpath
    cd  $rpath
    $proc $file
    ";  
    
	############################################################################ 
#	psftpCmd($text, "ftpLibFile".$proc); 	
	return $text;
}
 
################################################################################
# function syncInst
#
################################################################################
sub syncGetQue {  
    
	print "\t".'#' x 70 . "\n";	
	print "\tin syncGetQue ...\n"; 	 
	
    my $script = shift;  	
	my $tscript = "";
	
	foreach my $h (@get_que){	   	
	    print "\tname:".$$h{name}."\tnodetyp:".$$h{nodetyp}."\n"; 
	    if ($$h{nodetyp} eq "LIB"){
    		$tscript = $tscript.ftpFileHash($$h{name}, $$h{content}, "get"); 
    		
    		my $libs = $$h{name};
    		$libinfo{$libs} = $config{datpath}."\\".substr($rlibinfo{$libs}, rindex($rlibinfo{$libs}, "/")+1); 
    		
		}elsif ($$h{nodetyp} eq "FOLDER"){
    		$tscript = $tscript.ftpFileHash($$h{lib}, $$h{ftree}, "get");  
			
		}elsif ($$h{nodetyp} eq "FILE"){ 
			$tscript = $tscript.ftpLibFile($$h{lib}, $$h{name}, "get") ; 
		} 	
	}	
	recFtpScript($script, $tscript);  
	
}
################################################################################
# function syncPutQue
#
################################################################################
sub syncPutQue { 
	print "\t".'#' x 70 . "\n";	
	print "\tin syncPutQue ...\n"; 	 
	    
    my $script = shift;      
	my $tscript = "";
	
	foreach my $h (@put_que){	   	
	    print "\tname:".$$h{name}."\tnodetyp:".$$h{nodetyp}."\n"; 
	    
	    if ($$h{nodetyp} eq "LIB"){
    		$tscript = $tscript.ftpFileHash($$h{name}, $$h{content}, "put"); 
    		
    		my $libs = $$h{name};
    		$rlibinfo{$libs} = $config{remote_dat}."/".substr($libinfo{$libs}, rindex($libinfo{$libs}, "\\")+1); 
				
		}elsif ($$h{nodetyp} eq "FOLDER"){
			print "\n".$$h{lib}."\n";
    		$tscript = $tscript.ftpFileHash($$h{lib}, $$h{ftree}, "put");  
			
		}elsif ($$h{nodetyp} eq "FILE"){ 
			$tscript = $tscript.ftpLibFile($$h{lib}, $$h{name}, "put") ;
    		
		} 		
	} 
	recFtpScript($script, $tscript);  
	
}
################################################################################
# function syncInst
#
################################################################################
sub syncDelLoc { 
		
	print "\t".'#' x 70 . "\n";	
	print "\tin syncDelLoc ...\n"; 
	
	my $script = shift;      
	my $tscript = "";
	
	foreach my $h (@del_local_que){	 
	    print "\tname:".$$h{name}."\tnodetyp:".$$h{nodetyp}."\n"; 
	    
		if ($$h{nodetyp} eq "LIB"){
		    scriptLog("delete lib:".$libinfo{$$h{name}});
		    delete $libinfo{$$h{name}};
		    my $cmd = sprintf("rd /s /q ", $libinfo{$$h{lib}}); 
		    `$cmd`;
				
		}elsif ($$h{nodetyp} eq "FOLDER"){				
			my $lpath = $libinfo{$$h{lib}}.substr($$h{name},1); 
			$lpath =~ s/\//\\/g;
			
	    	scriptLog("rd /s /q $lpath");
			`rd /s /q $lpath`; 
			
		}elsif ($$h{nodetyp} eq "FILE"){ 
			my $f = $libinfo{$$h{lib}}.substr($$h{name},1); 
			$f =~ s/\//\\/g;			
			
	    	scriptLog("del $f");
			`del  $f`;  
		} 		
	}
  
}
################################################################################
# function syncDelRemote
#
################################################################################
sub syncDelRemote { 
	
	print "\t".'#' x 70 . "\n";	
	print "\tin syncDelRemote ...\n"; 
	    
    my $script = shift;      
	my $tscript = ""; 
	my $text = "";
	my $path = 1;
	foreach my $h (@del_remote_que){	
	    print "\tname:".$$h{name}."\tnodetyp:".$$h{nodetyp}."\n"; 
	    my $lastpath = 1;
	    my $delpath  = "$config{remote_dat}/deled/${lastpath}_del";
	    if ($$h{nodetyp} eq "LIB"){
	    	
	    	$path = $rlibinfo{$$h{name}};
	    	$lastpath = substr($path, rindex($path, "/")+1);
	    		    	
			$text = $text. "\nmv $path  $delpath"; 
			
	    	scriptLog("delete lib:".$rlibinfo{$$h{name}});
	    	delete $rlibinfo{$$h{name}};
	    	
		}elsif ($$h{nodetyp} eq "FOLDER"){				
			$path = $rlibinfo{$$h{lib}}.substr($$h{name},1); 	
	    	$lastpath = substr($path, rindex($path, "/")+1);	
	    	  		
			$text = $text. "\nmv $path $delpath \nrmdir  $path"; 
			
		}elsif ($$h{nodetyp} eq "FILE"){ 
			my $f = $rlibinfo{$$h{lib}}.substr($$h{name},1); 
			
			$text = $text. "\nrm  $f";  
		} 		
	}  
	scriptLog($text);
	recFtpScript($script, $text);  
}

################################################################################
# function syncItem
#
################################################################################
sub syncItem {   
	my $que     = shift;
	my $quenm   = shift;
	
	print "\n\t"; 
    print '#' x 60 . "\n"; 
	print "\tQUEUES:".$quenm. "\n";
	 
	foreach my $h (@$que){	
    	print "\t\t".'-' x 50 . "\n";	    	
    	print "\t\tname:".$$h{name}."\tnodetyp:".$$h{nodetyp}."\n"; 
    	
		if (($quenm eq "put_que")or($quenm eq "get_que")) {
			if ($$h{nodetyp} eq "LIB"){
				viewFileHash($$h{content}, 1); 
				
			}elsif ($quenm eq "FOLDER"){
				viewFileHash($$h{ftree}, 1);
			}
			
		}elsif(($quenm eq "del_local_que")or($quenm eq "del_remote_que")){
			if ($$h{nodetyp} eq "LIB"){
    			print "\t" x 3;		
				print "\troot:".$$h{root}."\n";
			}
		
		}
		
	}
}


################################################################################
# function recConfig
#
################################################################################
sub recConfig {  
	
	 recLibConfigFile($RealBin."/config/libconfig.conf", \%libinfo);
	 
	 recLibConfigFile($RealBin."/rlibconfig.conf", \%rlibinfo);
	 putLibConfig("rlibconfig.conf"); 
}

################################################################################
# function recConfigFile
#
################################################################################
sub recLibConfigFile {   
	my $file    = shift;
	my $hash    = shift;
	
#	print "\n"; 
#	print '-' x 80 . "\n";
#	print " in recLibConfigFile ... $file \n";
	
    my $text = "\n";
    foreach my $lib (keys %$hash){ 		
		$text = $text."$lib \t\t\t\t\t$$hash{$lib} \n";
	}
    
	open( my $fp, ">$file" ) or die "Can't open $file:$!";
    print {$fp} $text;
    
    close $fp;    
}



################################################################################
# function putLibConfig
#
################################################################################
sub putLibConfig {  
	my $file    = shift; 
    my $text = "
    cd $config{remote_conf}
    lcd  $config{bin} 
    put $file
    "; 
	psftpCmd($text, "putLibConfig"); 
}


################################################################################
# function recSync
#
################################################################################
sub recSync {    
	my $file    = shift;
	
	print "\n"; 
	print '-' x 80 . "\n";
	
    my $text = "";
    foreach my $lib (keys %libinfo){ 
	  
		my $lpath = $libinfo{$lib};
		my $lftree  = lsLocalLib($lpath); 
		
		my $strHead = "last_libs:".$lib."\n";
		
		my $strCon  = "";
		foreach my $spath (sort keys %$lftree){		
			foreach my $str (@{$$lftree{$spath}}){			
				$strCon = $strCon."\t".$spath."/".$str."\n";
			}
		}
		
		$text = $text.$strHead.$strCon."end_lib\n";
	}
    
	open( my $fp, ">$file" ) or die "Can't open $file: $!";
    print {$fp} $text;
    
    close $fp;    
}


################################################################################
# function scriptLog
#
################################################################################
sub scriptLog {  
	
    my $text = shift;
    
	my $file    = "script.log"; 
	
	open( my $fp, ">>$file" ) or die "Can't open $file: $!";
	
    print {$fp} '#' x 80 . "\n";
    print {$fp}  "log time:".localtime(time()) . "\n\n";
    
    print {$fp} "$text\n\n";
    
    print {$fp} '#' x 80 . "\n";
    close $fp;  
}


