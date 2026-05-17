<?php

namespace App\Mail;

use Illuminate\Mail\MailManager;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Symfony\Component\Mailer\Transport\Smtp\Stream\SocketStream;

class CustomMailManager extends MailManager
{
    protected function createSmtpTransport(array $config): EsmtpTransport
    {
        $transport = parent::createSmtpTransport($config);

        $stream = $transport->getStream();
        if ($stream instanceof SocketStream) {
            $stream->setStreamOptions([
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true,
                ],
            ]);
        }

        return $transport;
    }
}
