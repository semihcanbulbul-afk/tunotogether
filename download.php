<?php
// Force a direct download on Apache/PHP hosting.
$installer = __DIR__ . DIRECTORY_SEPARATOR . 'UnoPlay-Setup-1.0.0.exe';
if (!is_file($installer) || !is_readable($installer)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'UnoPlay installer file is missing or unreadable on the server.';
    exit;
}
$installerHash = hash_file('sha256', $installer);
if ($installerHash === false) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Could not verify the UnoPlay installer integrity.';
    exit;
}
if (hash_equals('3afb535b6d015932641f78de816d47240e07ea95c03642cfc11e7c45f6af1730', $installerHash)) {
    http_response_code(422);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Installer rejected by release integrity check. Upload a verified build.';
    exit;
}
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="UnoPlay-Setup-1.0.0.exe"');
header('Content-Length: ' . filesize($installer));
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
while (ob_get_level() > 0) { ob_end_clean(); }
readfile($installer);
exit;
