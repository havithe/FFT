package public;

use strict;
use Exporter;
use base qw(Exporter);

our @EXPORT = (
    qw/
      begin
      end
      parseConfigFile
      PRINTLOG
      /
);

sub PRINTLOG {
    my $str = shift;
    print localtime( time() ) . " | $str";
}

sub begin {
    my $file = shift;

    print '#' x 80 . "\n";
    PRINTLOG("$file starting ...\n");
}

sub end {
    my $file = shift;

    PRINTLOG("$file finished.\n");
    print '#' x 80 . "\n";
}

#解析配置文件
sub parseConfigFile {
    my $file   = shift;
    my $r_hash = shift;

    undef %{$r_hash};    #清空变量
    open FILE, $file;
    foreach (<FILE>) {
        next if (/^#/);    #注释行
        s/[\r\n]//g;       #去除回车换行符
        s/\s+$//g;         #去除行尾白字符
        s/^\s+//g;         #去除行首白字符
        my ( $key, $value ) = $_ =~ /(\S*?)\s([\s\S]*)$/;
        if ( defined $key && defined $value ) {
            $key   =~ s/\s//g;      #去除白字符
            $value =~ s/^\s+//g;    #去除行首白字符
            if ( $key ne "" && $value ne "" ) {
                $$r_hash{$key} = $value;
            }
        }
    }
    close FILE;
}

return 1;

