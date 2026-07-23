import Image from "next/image";
import Link from "next/link";
import { BookingAttributionFields, BookingLink } from "@/components/BookingPath";
import LivingHeroMedia from "@/components/LivingHeroMedia";
import RoomSignal from "@/components/RoomSignal";

const clips = [
  {
    title: "Trap Queen birthday room",
    src: "/video/trap-queen-room.mp4",
    poster: "/video/trap-queen-poster.webp",
    roomLabel: "ROOM 01",
  },
  {
    title: "Dilemma singalong",
    src: "/video/dilemma-singalong.mp4",
    poster: "/video/dilemma-poster.webp",
    roomLabel: "ROOM 02",
  },
];

const eventFits = [
  {
    title: "Private Celebrations",
    detail: "Birthdays, engagements and house parties.",
  },
  {
    title: "Venue Nights",
    detail: "Bars, rooftops and venue nights.",
  },
  {
    title: "Weddings and Events",
    detail: "Weddings, community events and milestones.",
  },
];

const process = [
  ["Send your enquiry", "Share your event details."],
  ["Receive your quote", "Get the scope, price and inclusions."],
  ["Secure your booking", "Accept the quote and pay the deposit."],
  ["Plan your event", "Share the final event and music details."],
];

const gallery = [
  "/assets/dj-kuya-16.webp",
  "/assets/dj-kuya-01.webp",
  "/assets/dj-kuya-04.webp",
  "/assets/dj-kuya-07.webp",
  "/assets/dj-kuya-10.webp",
  "/assets/dj-kuya-13.webp",
];

export default function SikuyaExperience() {
  return (
    <main>
      <RoomSignal />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <Link className="brand" href="/" aria-label="Sikuya home">
          SIKUYA
        </Link>
        <nav aria-label="Primary navigation">
          <a href="#room">The room</a>
          <a href="#events">Events</a>
          <a href="#story">Story</a>
          <BookingLink className="header-cta">
            Book Sikuya
          </BookingLink>
        </nav>
      </header>

      <div id="main-content">
        <section className="split-hero" aria-labelledby="hero-title">
          <div className="hero-collage" aria-label="Sikuya performing behind the decks">
            <LivingHeroMedia />
            <p className="collage-caption">Good music · better memories</p>
          </div>

          <div className="hero-story">
            <p className="eyebrow">AU · PH</p>
            <h1 id="hero-title" aria-label="The room remembers how it felt.">
              <span>The room</span>
              <span>remembers</span>
              <span>how it felt.</span>
            </h1>
            <p className="hero-lede">
              R&amp;B, Afrobeats, hip hop, OPM, house and crowd favourites.
            </p>
            <div className="hero-actions">
              <BookingLink className="primary-cta">
                Book Sikuya <span aria-hidden="true">↗</span>
              </BookingLink>
              <a className="text-cta" href="#room">
                <span className="play-dot" aria-hidden="true">▶</span>
                Watch the room
              </a>
            </div>

            <form className="booking-tease" action="/book" method="get" aria-label="Start the booking enquiry">
              <BookingAttributionFields />
              <span className="booking-tease-label">Start with the basics</span>
              <button className="booking-tease-action" type="submit">Continue enquiry</button>
              <label className="quick-field"><small>Date</small><input name="eventDate" type="date" aria-label="Event date" /></label>
              <label className="quick-field"><small>Event</small><select name="eventType" defaultValue=""><option value="">Choose type</option><option>Birthday</option><option>Private party</option><option>Wedding</option><option>Venue night</option><option>Corporate event</option><option>Community event</option><option>Other celebration</option></select></label>
              <label className="quick-field"><small>Start</small><input name="startTime" type="time" aria-label="Music start time" /></label>
              <label className="quick-field"><small>Finish</small><input name="finishTime" type="time" aria-label="Music finish time" /></label>
            </form>
          </div>
        </section>

        <section className="proof-strip reveal-surface" aria-label="Events Sikuya plays">
          <span>Made for</span>
          <strong>Private Celebrations</strong>
          <strong>Venue Nights</strong>
          <strong>Weddings and Events</strong>
        </section>

        <section className="room-section section-shell reveal-surface" id="room" aria-labelledby="room-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Real rooms</p>
              <h2 id="room-title">Feel it before you book it.</h2>
            </div>
            <p>A few moments from the room.</p>
          </div>
          <div className="clip-grid">
            {clips.map((clip) => (
              <article className="clip-card" key={clip.title}>
                <div className="clip-room-label" aria-hidden="true">{clip.roomLabel}</div>
                <video
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  poster={clip.poster}
                  aria-label={clip.title}
                >
                  <source src={clip.src} type="video/mp4" />
                </video>
                <div className="clip-copy">
                  <p className="clip-label">From the room</p>
                  <h3>{clip.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="event-section section-shell reveal-surface" id="events" aria-labelledby="events-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Where it fits</p>
              <h2 id="events-title">What are you planning?</h2>
            </div>
            <p>No fixed playlist.</p>
          </div>
          <div className="event-offers">
            <div className="event-grid">
              {eventFits.map((event) => (
                <article key={event.title}>
                  <h3>{event.title}</h3>
                  <p>{event.detail}</p>
                </article>
              ))}
            </div>
            <div className="event-grid-action">
              <BookingLink className="primary-cta">
                Book Sikuya <span aria-hidden="true">↗</span>
              </BookingLink>
            </div>
          </div>
        </section>

        <section className="process-section section-shell reveal-surface" aria-labelledby="process-title">
          <div className="process-intro">
            <p className="eyebrow">From enquiry to the room</p>
            <h2 id="process-title">How booking works.</h2>
            <p>
              An enquiry does not reserve the date. Your booking is confirmed after you accept
              the quote and pay the required deposit.
            </p>
          </div>
          <ol className="process-list">
            {process.map(([title, detail], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="story-section reveal-surface" id="story" aria-labelledby="story-title">
          <div className="story-photo">
            <Image
              src="/assets/dj-kuya-07.webp"
              alt="Sikuya connecting with the room during an event set"
              fill
              sizes="(max-width: 780px) 100vw, 46vw"
            />
          </div>
          <div className="story-copy">
            <p className="eyebrow">Sikuya</p>
            <h2 id="story-title">AU · PH roots.</h2>
            <p>
              OPM, R&amp;B, Afrobeats, house, pop and hip hop all have a place.
            </p>
          </div>
        </section>

        <section className="gallery-section reveal-surface" aria-label="Sikuya event gallery">
          {gallery.map((src, index) => (
            <figure key={src}>
              <Image
                src={src}
                alt={index === 0 ? "Close view of the decks during an event set" : `Sikuya event moment ${index + 1}`}
                fill
                sizes="(max-width: 640px) 72vw, 24vw"
              />
              <figcaption>Room study · {String(index + 1).padStart(2, "0")}</figcaption>
            </figure>
          ))}
        </section>

        <section className="final-cta section-shell reveal-surface" aria-labelledby="final-title">
          <p className="eyebrow">Have a date in mind?</p>
          <h2 id="final-title">Tell me about it.</h2>
          <p>It starts an enquiry, not a confirmed booking.</p>
          <BookingLink className="primary-cta">
            Book Sikuya <span aria-hidden="true">↗</span>
          </BookingLink>
        </section>
      </div>

      <footer className="site-footer">
        <div>
          <strong>SIKUYA</strong>
          <span>AU · PH</span>
        </div>
        <a href="mailto:bookings@djsikuya.com">bookings@djsikuya.com</a>
        <p className="footer-signoff">
          <span>Open format.</span>
          <span>Made for the moment.</span>
        </p>
      </footer>

    </main>
  );
}
