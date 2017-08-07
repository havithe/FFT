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

#���������ļ�
sub parseConfigFile {
    my $file   = shift;
    my $r_hash = shift;

    undef %{$r_hash};    #��ձ���
    open FILE, $file;
    foreach (<FILE>) {
        next if (/^#/);    #ע����
        s/[\r\n]//g;       #ȥ���س����з�
        s/\s+$//g;         #ȥ����β���ַ�
        s/^\s+//g;         #ȥ�����װ��ַ�
        my ( $key, $value ) = $_ =~ /(\S*?)\s([\s\S]*)$/;
        if ( defined $key && defined $value ) {
            $key   =~ s/\s//g;      #ȥ�����ַ�
            $value =~ s/^\s+//g;    #ȥ�����װ��ַ�
            if ( $key ne "" && $value ne "" ) {
                $$r_hash{$key} = $value;
            }
        }
    }
    close FILE;
}

return 1;

