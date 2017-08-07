package path;

use strict;
use Exporter;
use base qw(Exporter);

our @EXPORT = (
    qw/
      putFile
      gettFile
      getFileSFTP
      putFileSFTP
      /
);

################################################################################
# function
# putFile
################################################################################
sub putFile {
    my $file = shift;
    
} 


################################################################################
# function
# gettFile
################################################################################
sub gettFile {
    my $file = shift;
    
} 




################################################################################
# function
# getFileSFTP
################################################################################
sub getFileSFTP {
    my $host    = shift;
    my $port    = shift;
    my $user    = shift;
    my $pwd     = shift;
    my $rpath     = shift;
    my $lpath     = shift;
    
    my $file    = shift;

    #生成SH脚本，下载SFTP文件
    my $shname = $RealBin . "/" . $file . "sftp.sh";
    my $text   = "#!/bin/sh
		lftp sftp://$host:$port <<eof
		user $user $pwd
		cd $rpath
		lcd $lpath
		get $file
		bye
		eof
		";

    open( my $fp, ">$shname" ) or die "Can't open $shname: $!";
    print {$fp} $text;
    close $fp;

    `sh $shname`;
    unlink $shname;
    my $sfile = $lpath."/".$file; 
    if (!(-e $sfile)){
        print "$file not exist in ftp server:$host!\n";
    }
    
    print "\nget datafile [$file] finished ...";
}

################################################################################
# function
# putFileSFTP
################################################################################
sub putFileSFTP {
    my $host    = shift;
    my $port    = shift;
    my $user    = shift;
    my $pwd     = shift;
    my $rpath     = shift;
    my $lpath     = shift;
    
    my $file    = shift; 

    #生成SH脚本，放置文件
    my $shname = $RealBin . "/" . $file . "putFileSFTP.sh";
    my $text1  = "#!/bin/sh
lftp -u $user,$pwd sftp://$host:$port <<EOF
cd $rpath
lcd $lpath
";
    my $text2 = "
bye
EOF
";
    my $texts = ""; 
    $texts = sprintf( "%s\nput %s", $texts, $file ); 
        
    open( my $fp, ">$shname" ) or die "Can't open $shname: $!";
    print {$fp} $text1 . $texts . $text2;
    close $fp;
    
    `sh $shname`;
    unlink $shname; 
}

 

return 1;

