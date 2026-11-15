"use client";
import {useServiceCatalog} from "@/lib/use-service-catalog";
import { useEffect, useState } from "react";
import Image from "next/image";
import { adminFetch } from "@/lib/admin-fetch";
import CustomerNoteCard from "./CustomerNoteCard";
type Extra = {
  serviceType: string;
  durationMinutes: number;
  customerRequest: string | null;
  referenceImageIds: string[];
  userId: string;
};
export default function ReservationExtras({
  reservationId,
  showCustomerNote = true,
}: {
  reservationId: string;
  showCustomerNote?: boolean;
}) {
  const catalog=useServiceCatalog();
  const [data, setData] = useState<Extra>();
  const [images, setImages] = useState<{ id: string; url: string }[]>([]);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const urls: string[] = [];
    setError("");
    (async () => {
      const response = await adminFetch(
        `/api/studio/reservation?id=${encodeURIComponent(reservationId)}`,
        { signal: controller.signal },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      const loaded = await Promise.all(
        (result.referenceImageIds as string[]).map(async (id) => {
          const image = await adminFetch(`/api/media/${id}`, {
            signal: controller.signal,
          });
          if (!image.ok) throw new Error("参考图加载失败");
          const blob = await image.blob();
          if (controller.signal.aborted) return null;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          return { id, url };
        }),
      );
      if (!controller.signal.aborted)
        setImages(loaded.filter((v): v is { id: string; url: string } => !!v));
    })().catch((e) => {
      if (e.name !== "AbortError") setError(e.message || "款式资料加载失败");
    });
    return () => {
      controller.abort();
      urls.forEach(URL.revokeObjectURL);
    };
  }, [reservationId, reload]);
  return (
    <>
      <section className="admin-panel reservation-reference-card">
        <div className="admin-panel-heading">
          <div>
            <h2>本次服务与款式参考</h2>
            <p className="admin-subtle">顾客提交的期待，作为本次服务的灵感。</p>
          </div>
        </div>
        {error && (
          <div role="alert">
            <p className="my-2 text-sm">{error}</p>
            <button
              className="underline"
              onClick={() => setReload((n) => n + 1)}
            >
              重新加载
            </button>
          </div>
        )}
        {data ? (
          <>
            <p className="admin-chip pink mb-4">
              {catalog.find(s=>s.id===data.serviceType)?.names.zh || data.serviceType} ·{" "}
              {data.durationMinutes} 分钟
            </p>
            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-600">
              顾客本次需求：{data.customerRequest || "未填写"}
            </p>
            <div className="reference-gallery">
              {images.map((image) => (
                <a
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  key={image.id}
                >
                  <Image
                    src={image.url}
                    alt="顾客款式参考图"
                    width={120}
                    height={120}
                    unoptimized
                  />
                </a>
              ))}
            </div>
            {!data.referenceImageIds.length && (
              <p className="mt-2 text-xs text-gray-400">本次未上传参考图</p>
            )}
          </>
        ) : (
          !error && <p>加载中…</p>
        )}
      </section>
      {showCustomerNote && data && <CustomerNoteCard userId={data.userId} />}
    </>
  );
}
