use strict;
use warnings;
use MIME::Base64;
use FindBin qw($RealBin);

my $src_dir   = $RealBin;
my $repo_root = "$src_dir/..";
my $shots_dir = "$repo_root/enode-dashboard/screenshots";
my $out_file  = "$repo_root/docs/index.html";

my %mapping = (
    "__IMG_OPS_FULL__"      => "operations-dashboard.png",
    "__IMG_OPS_FLEET__"     => "operations-running-enodes-detail.png",
    "__IMG_OPS_RUN__"       => "operations-run-inspection-detail.png",
    "__IMG_ME_FULL__"       => "my-work.png",
    "__IMG_ME_LIST__"       => "my-work-list-detail.png",
    "__IMG_ME_DLC__"        => "my-work-dlc-context-detail.png",
    "__IMG_ME_RUNDETAIL__"  => "my-work-run-detail.png",
);

sub slurp {
    my ($path) = @_;
    open(my $fh, '<:raw', $path) or die "cannot open $path: $!";
    local $/;
    my $data = <$fh>;
    close($fh);
    return $data;
}

my $html = do {
    open(my $fh, '<:encoding(UTF-8)', "$src_dir/template.html") or die $!;
    local $/;
    <$fh>;
};

for my $placeholder (keys %mapping) {
    my $file = "$shots_dir/$mapping{$placeholder}";
    my $bin = slurp($file);
    my $mime = (substr($bin, 0, 2) eq "\xff\xd8") ? "image/jpeg" : "image/png";
    my $b64 = encode_base64($bin, '');
    my $uri = "data:$mime;base64,$b64";
    my $count = () = $html =~ /\Q$placeholder\E/g;
    die "placeholder $placeholder not found in template.html" if $count == 0;
    print "embedding $placeholder <- $mapping{$placeholder} ($count occurrence(s))\n";
    $html =~ s/\Q$placeholder\E/$uri/g;
}

open(my $out, '>:encoding(UTF-8)', $out_file) or die $!;
print $out $html;
close($out);

print "wrote $out_file (" . (-s $out_file) . " bytes)\n";

# artifacts.html needs no placeholder substitution -- copy verbatim.
my $artifacts_src = "$src_dir/artifacts.html";
my $artifacts_out = "$repo_root/docs/artifacts.html";
if (-e $artifacts_src) {
    open(my $ain, '<:raw', $artifacts_src) or die $!;
    local $/;
    my $adata = <$ain>;
    close($ain);
    open(my $aout, '>:raw', $artifacts_out) or die $!;
    print $aout $adata;
    close($aout);
    print "wrote $artifacts_out (" . (-s $artifacts_out) . " bytes)\n";
}
